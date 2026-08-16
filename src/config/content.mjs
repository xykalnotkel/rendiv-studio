/**
 * Data konten video (plain JS agar bisa dibaca script Node & bundler).
 * Tipe-nya didefinisikan di content.ts.
 */
export const content = {
  title: 'Rendiv — video editor untuk AI',
  scenes: [
    {
      id: 'seg1',
      kind: 'hook',
      narration: 'Bayangkan bikin video cuma dengan menulis kode. Tanpa timeline. Tanpa drag and drop.',
      data: { lineA: 'Bikin video', lineB: 'pakai KODE' },
    },
    {
      id: 'seg2',
      kind: 'code',
      narration: 'Setiap video adalah komponen React. Satu fungsi murni dari waktu.',
      data: {
        filename: 'Video.tsx',
        lines: [
          ['const', ' frame = useFrame();'],
          ['const', ' opacity = interpolate('],
          ['', '  frame, [0, 30], [0, 1]'],
          ['', ');'],
          ['return', ' <h1 style={{ opacity }}>'],
          ['', '  Halo!'],
          ['', '</h1>;'],
        ],
      },
    },
    {
      id: 'seg3',
      kind: 'param',
      narration:
        'Ganti satu angka, seluruh video ikut berubah. Semuanya bisa masuk git, bisa di-review, bisa diotomasi.',
      data: {
        label: 'ganti 1 angka →',
        caption: 'seluruh video ikut berubah',
        unit: 'fps',
        values: ['30', '60', '120'],
      },
    },
    {
      id: 'seg4',
      kind: 'steps',
      narration: 'Dan karena isinya cuma kode, AI bisa menulisnya untukmu. Kasih prompt, dapat video jadi.',
      data: {
        steps: [
          { icon: '💬', text: 'Kamu kasih prompt' },
          { icon: '🤖', text: 'AI menulis komponen' },
          { icon: '🎬', text: 'Keluar file MP4' },
        ],
      },
    },
    {
      id: 'seg5',
      kind: 'outro',
      narration: 'Namanya Rendiv. Gratis, open source, dan siap kamu coba hari ini.',
      data: {
        brand: 'RENDIV',
        tagline: 'open source · gratis',
        cta: 'npx create-rendiv',
      },
    },
  ],
};
