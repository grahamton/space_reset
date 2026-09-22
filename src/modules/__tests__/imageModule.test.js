import { describe, it, expect, vi, afterEach } from 'vitest';

import { fitWithinLimits, prepareImageForUpload, MAX_EDGE, MAX_PIXELS } from '../imageModule';

describe('fitWithinLimits', () => {
  it('shrinks a 4080x3072 phone photo inside both the edge and pixel limits', () => {
    const { width, height } = fitWithinLimits(4080, 3072);

    expect(Math.max(width, height)).toBeLessThanOrEqual(MAX_EDGE);
    expect(width * height).toBeLessThanOrEqual(MAX_PIXELS);
    expect(width / height).toBeCloseTo(4080 / 3072, 2);
  });

  it('caps a long panorama by its edge', () => {
    expect(fitWithinLimits(8000, 1000)).toEqual({ width: MAX_EDGE, height: 322 });
  });

  it('never upscales a small image', () => {
    expect(fitWithinLimits(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe('prepareImageForUpload', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const stubBitmap = (width, height) =>
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width, height, close: vi.fn() })
    );

  const stubCanvas = () => {
    const drawImage = vi.fn();
    const canvas = {
      getContext: () => ({ drawImage }),
      toBlob: (callback) => callback(new Blob(['jpeg'], { type: 'image/jpeg' }))
    };
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'canvas' ? canvas : realCreate(tag)
    );
    return { canvas, drawImage };
  };

  it('re-encodes an oversized photo as a JPEG within the limits', async () => {
    stubBitmap(4080, 3072);
    const { canvas, drawImage } = stubCanvas();

    const result = await prepareImageForUpload(
      new File(['x'], 'PXL_2026.jpg', { type: 'image/jpeg' })
    );

    expect(result.type).toBe('image/jpeg');
    expect(result.name).toBe('PXL_2026.jpg');
    expect(canvas.width * canvas.height).toBeLessThanOrEqual(MAX_PIXELS);
    expect(drawImage).toHaveBeenCalled();
  });

  it('sends a small, supported photo untouched', async () => {
    stubBitmap(1200, 900);
    const file = new File(['x'], 'small.png', { type: 'image/png' });

    expect(await prepareImageForUpload(file)).toBe(file);
  });

  it('converts formats the worker does not accept, even when small', async () => {
    stubBitmap(1200, 900);
    stubCanvas();

    const result = await prepareImageForUpload(
      new File(['x'], 'photo.heic', { type: 'image/heic' })
    );
    expect(result).toMatchObject({ type: 'image/jpeg', name: 'photo.jpg' });
  });

  it('throws a readable error when the image cannot be decoded', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('bad')));

    await expect(
      prepareImageForUpload(new File(['x'], 'broken.jpg', { type: 'image/jpeg' }))
    ).rejects.toThrow("Couldn't open that photo");
  });
});
