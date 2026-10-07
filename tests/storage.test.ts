import { describe, expect, it, vi } from 'vitest';
import { StorageError, SupabaseStorage } from '../src/storage';

const env={SUPABASE_URL:'https://project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'service-role-secret',SUPABASE_STORAGE_BUCKET:'chitra-private'};

describe('Supabase private storage adapter',()=>{
  it('uploads and downloads objects through authenticated storage routes',async()=>{
    const calls:Array<{url:string;init:RequestInit}> = [];
    const request=vi.fn<typeof fetch>().mockImplementation(async(input,init)=>{
      calls.push({url:String(input),init:init??{}});
      if(init?.method==='GET') return new Response(new Uint8Array([1,2,3]),{status:200,headers:{'content-type':'image/webp'}});
      return Response.json({Key:'originals/biz/job/source.webp'});
    });
    const storage=new SupabaseStorage(env,request);
    await storage.put('originals/biz/job/source.webp',new Uint8Array([1,2,3]),'image/webp');
    const object=await storage.get('originals/biz/job/source.webp');
    expect(object?.size).toBe(3); expect([...new Uint8Array(await object!.arrayBuffer())]).toEqual([1,2,3]);
    expect(calls[0].url).toBe('https://project.supabase.co/storage/v1/object/chitra-private/originals/biz/job/source.webp');
    expect(calls[0].init.method).toBe('POST'); expect(new Headers(calls[0].init.headers).get('x-upsert')).toBe('true');
    expect(calls[1].url).toContain('/object/authenticated/chitra-private/');
    expect(new Headers(calls[1].init.headers).get('Authorization')).toBe('Bearer service-role-secret');
  });
  it('deletes selected keys and recursively lists only under the requested prefix',async()=>{
    const calls:Array<{url:string;init:RequestInit}> = [];
    const request=vi.fn<typeof fetch>().mockImplementation(async(input,init)=>{
      calls.push({url:String(input),init:init??{}});
      const body=JSON.parse(String(init?.body??'{}')) as {prefix?:string};
      if(String(input).includes('/object/list/')) {
        if(body.prefix==='originals/biz') return Response.json([{name:'job',id:null}]);
        if(body.prefix==='originals/biz/job') return Response.json([{name:'source.webp',id:'object-id'}]);
      }
      return Response.json({});
    });
    const storage=new SupabaseStorage(env,request);
    expect(await storage.list('originals/biz/')).toEqual(['originals/biz/job/source.webp']);
    await storage.delete(['originals/biz/job/source.webp']);
    const remove=calls.find(call=>call.init.method==='DELETE')!;
    expect(remove.url).toBe('https://project.supabase.co/storage/v1/object/chitra-private');
    expect(JSON.parse(String(remove.init.body))).toEqual({prefixes:['originals/biz/job/source.webp']});
    expect(calls.some(call=>call.url.includes('/object/public/'))).toBe(false);
  });
  it('treats missing downloads as absent and rejects unsafe keys and failed requests',async()=>{
    const missing=new SupabaseStorage(env,vi.fn<typeof fetch>().mockResolvedValue(new Response('',{status:404})));
    expect(await missing.get('originals/biz/job/source.webp')).toBeNull();
    await expect(missing.get('../outside')).rejects.toBeInstanceOf(StorageError);
    const failed=new SupabaseStorage(env,vi.fn<typeof fetch>().mockResolvedValue(new Response('private details',{status:500})));
    await expect(failed.get('originals/biz/job/source.webp')).rejects.toMatchObject({code:'storage_http_500'});
  });
});
