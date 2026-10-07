import {
  AbsoluteFill,
  Composition,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';

const colors = {
  cream: '#f5f2eb',
  ink: '#25241f',
  muted: '#77746c',
  line: '#d8d4ca',
  message: '#e9f1e5',
};

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

const ImageSent = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 9, 47, 60], [0, 1, 1, 0], clamp);
  const y = interpolate(frame, [0, 9], [16, 0], clamp);

  return (
    <div style={{
      position: 'absolute', right: 30, bottom: 34, display: 'flex', alignItems: 'center', gap: 18,
      width: 440, padding: 17, borderRadius: 14, backgroundColor: colors.message,
      opacity, transform: `translateY(${y}px)`, color: colors.ink,
    }}>
      <Img src={staticFile('images/product-before.webp')} style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 7 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <span style={{ fontSize: 21, color: colors.muted }}>You</span>
        <span style={{ fontSize: 29, fontWeight: 500 }}>Image sent <span style={{ color: '#547560', fontSize: 20 }}>✓✓</span></span>
      </div>
    </div>
  );
};

const PreparingMessage = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, 45, 58], [0, 1, 1, 0], clamp);
  const y = interpolate(frame, [0, 10], [14, 0], clamp);

  return (
    <div style={{
      position: 'absolute', right: 30, bottom: 34, width: 530, padding: '22px 25px',
      border: `1px solid ${colors.line}`, borderRadius: 10, backgroundColor: colors.cream,
      opacity, transform: `translateY(${y}px)`, color: colors.ink,
    }}>
      <div style={{ marginBottom: 9, fontSize: 17, fontWeight: 600, letterSpacing: 2, color: colors.muted }}>GROWX CHITRA</div>
      <div style={{ fontSize: 29, lineHeight: 1.3 }}>Growx Chitra is preparing your image.</div>
    </div>
  );
};

const FinalBrand = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], clamp);
  const y = interpolate(frame, [0, 12], [8, 0], clamp);

  return (
    <>
      <div style={{ position: 'absolute', right: 28, top: 1227, opacity, transform: `translateY(${y}px)`, color: '#332a23', textAlign: 'right' }}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 2.4 }}>MITTI STUDIO</div>
        <div style={{ marginTop: 4, fontSize: 13, letterSpacing: 2, color: '#776b60' }}>HANDMADE CERAMICS</div>
      </div>
      <div style={{ position: 'absolute', left: 28, top: 1230, opacity, transform: `translateY(${y}px)`, color: colors.ink, fontSize: 32, letterSpacing: -1 }}>Ready to share.</div>
    </>
  );
};

export const GrowxChitraDemo = () => {
  const frame = useCurrentFrame();
  const revealed = interpolate(frame, [139, 178], [0, 100], clamp);
  const imageScale = interpolate(frame, [0, 38], [1.025, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.cream, color: colors.ink, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ position: 'absolute', left: 80, top: 43, fontSize: 27, fontWeight: 600, letterSpacing: -1.8 }}>
        growx<span style={{ fontWeight: 400 }}> chitra</span>
      </div>
      <div style={{ position: 'absolute', left: 80, top: 91, width: 1040, height: 1, backgroundColor: colors.line }} />

      <div style={{ position: 'absolute', left: 80, top: 120, width: 1040, height: 1300, overflow: 'hidden', backgroundColor: '#e8e0d4' }}>
        <Img src={staticFile('images/product-before.webp')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${imageScale})` }} />
        <Img src={staticFile('images/product-after.webp')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', clipPath: `inset(0 ${100 - revealed}% 0 0)` }} />
        <Sequence name="Image sent" from={38} durationInFrames={63}><ImageSent /></Sequence>
        <Sequence name="Preparing image" from={94} durationInFrames={62}><PreparingMessage /></Sequence>
        <Sequence name="Brand and ready" from={201} durationInFrames={69}><FinalBrand /></Sequence>
      </div>
    </AbsoluteFill>
  );
};

export const GrowxChitraComposition = () => (
  <Composition
    id="GrowxChitraDemo"
    component={GrowxChitraDemo}
    width={1200}
    height={1500}
    fps={30}
    durationInFrames={270}
  />
);
