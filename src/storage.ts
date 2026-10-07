import type { Env, PrivateStorage, StoredObject } from './types';

export class StorageError extends Error {
  constructor(public readonly code:string,public readonly status?:number) { super(code); }
}

function cleanKey(key:string):string {
  if(!key || key.startsWith('/') || key.includes('\\') || key.split('/').some(part=>!part || part==='.' || part==='..')) throw new StorageError('invalid_storage_key');
  return key;
}

export class SupabaseStorage implements PrivateStorage {
  private readonly root:string;
  private readonly headers:HeadersInit;
  constructor(private readonly env:Pick<Env,'SUPABASE_URL'|'SUPABASE_SERVICE_ROLE_KEY'|'SUPABASE_STORAGE_BUCKET'>,private readonly request:typeof fetch=fetch) {
    let url:URL;
    try { url=new URL(env.SUPABASE_URL); } catch { throw new StorageError('invalid_storage_configuration'); }
    if(url.protocol!=='https:' && !['localhost','127.0.0.1'].includes(url.hostname)) throw new StorageError('invalid_storage_configuration');
    if(!env.SUPABASE_SERVICE_ROLE_KEY || !/^[a-zA-Z0-9_-]{1,100}$/.test(env.SUPABASE_STORAGE_BUCKET)) throw new StorageError('invalid_storage_configuration');
    this.root=`${url.toString().replace(/\/$/,'')}/storage/v1`;
    this.headers={apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`};
  }
  private path(key:string):string { return key.split('/').map(encodeURIComponent).join('/'); }
  private endpoint(resource:string):string { return `${this.root}${resource}`; }
  private async checked(url:string,init:RequestInit,allowMissing=false):Promise<Response|null> {
    let response:Response;
    try { response=await this.request(url,{...init,signal:AbortSignal.timeout(30_000),redirect:'error'}); }
    catch { throw new StorageError('storage_network_error'); }
    if(allowMissing && response.status===404) return null;
    if(!response.ok) throw new StorageError(`storage_http_${response.status}`,response.status);
    return response;
  }
  async put(key:string,body:ArrayBuffer|Uint8Array,contentType='application/octet-stream'):Promise<void> {
    const safe=cleanKey(key);
    const uploadBody=body instanceof ArrayBuffer ? body : Uint8Array.from(body).buffer;
    await this.checked(this.endpoint(`/object/${encodeURIComponent(this.env.SUPABASE_STORAGE_BUCKET)}/${this.path(safe)}`),{
      method:'POST',headers:{...this.headers,'Content-Type':contentType,'x-upsert':'true'},body:uploadBody
    });
  }
  async get(key:string):Promise<StoredObject|null> {
    const safe=cleanKey(key);
    const response=await this.checked(this.endpoint(`/object/authenticated/${encodeURIComponent(this.env.SUPABASE_STORAGE_BUCKET)}/${this.path(safe)}`),{method:'GET',headers:this.headers},true);
    if(!response) return null;
    const bytes=await response.arrayBuffer();
    return {size:bytes.byteLength,arrayBuffer:async()=>bytes};
  }
  async delete(keys:string|string[]):Promise<void> {
    const unique=[...new Set((Array.isArray(keys)?keys:[keys]).map(cleanKey))];
    for(let i=0;i<unique.length;i+=100) {
      await this.checked(this.endpoint(`/object/${encodeURIComponent(this.env.SUPABASE_STORAGE_BUCKET)}`),{
        method:'DELETE',headers:{...this.headers,'Content-Type':'application/json'},body:JSON.stringify({prefixes:unique.slice(i,i+100)})
      });
    }
  }
  async list(prefix:string):Promise<string[]> {
    const safe=cleanKey(prefix.replace(/\/$/,'') || '_');
    if(safe==='_') throw new StorageError('invalid_storage_prefix');
    const output:string[]=[]; const folders=[safe];
    while(folders.length) {
      const folder=folders.pop()!; let offset=0;
      for(;;) {
        const response=await this.checked(this.endpoint(`/object/list/${encodeURIComponent(this.env.SUPABASE_STORAGE_BUCKET)}`),{
          method:'POST',headers:{...this.headers,'Content-Type':'application/json'},
          body:JSON.stringify({prefix:folder,limit:1000,offset,sortBy:{column:'name',order:'asc'}})
        });
        const rows=await response!.json() as Array<{name?:unknown;id?:unknown;metadata?:unknown}>;
        if(!Array.isArray(rows)) throw new StorageError('storage_invalid_list_response');
        for(const row of rows) {
          if(typeof row.name!=='string' || !row.name || row.name.includes('/') || row.name==='.' || row.name==='..') continue;
          const path=`${folder}/${row.name}`;
          if(row.id===null || row.id===undefined) folders.push(path); else output.push(path);
        }
        offset+=rows.length;
        if(rows.length<1000) break;
      }
    }
    return output;
  }
}

export function getStorage(env:Env):PrivateStorage { return env.STORAGE ?? new SupabaseStorage(env); }
