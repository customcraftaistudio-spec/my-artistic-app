import { createClient } from '@supabase/supabase-js';

// KONFIGURASI PENTING: Tingkatkan batas ukuran upload agar bisa menerima file gambar
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

// Dictionary Prompt
const CONCEPTS = {
  originalEnhancement: {
    prompts: [
      "Professional 8k portrait photograph featuring the exact subject from the reference image. Photorealistic, enhanced clarity, sharp focus on facial features, natural skin texture preservation, color corrected, neutral studio lighting, isolated on a plain white background for easy automatic background removal, high definition details.",
      "High-end 8k beauty portrait of the subject from the reference image. Flawless yet realistic skin texture, subtle professional retouching to remove blemishes and stray hairs, neat appearance, soft flattering studio lighting, strict facial consistency with reference, isolated on a solid light grey background, ultra-sharp focus on eyes.",
      "Masterpiece 8k hyper-realistic portrait of the person in the reference image. Advanced tonal correction, dynamic range enhancement, intricate facial details and iris texture preservation, professional color grading, perfect three-point lighting setup, strict identity consistency, isolated on a transparent-ready plain background."
    ]
  },
  artisticPicture: {
    prompts: [
      "Artistic 8k low-key portrait painting of the subject from reference image. Dramatic chiaroscuro lighting, deep shadows, moody atmosphere, visible brushstrokes texture, intense expression, maintaining recognizable facial features, dark aesthetic, isolated portrait on a removable background.",
      "Minimalist modern vector art illustration of the person in the reference image. Clean lines, flat smooth colors, geometric shapes, high contrast, maintaining accurate facial structure and identity, contemporary graphic design style, 8k resolution, isolated on a solid white background.",
      "Creative double exposure artistic portrait of the subject from reference image. Face silhouette merged with a serene nature landscape (forest and mountains), intricate details, surreal aesthetic, 8k, maintaining recognizable profile/face shape, studio lighting, isolated on white background."
    ]
  },
  vintageStyle: {
    prompts: [
      "Authentic 1940s American film noir style portrait. Black and white photography, grainy film texture. Features the subject from reference image, matching their actual age. Wearing period-accurate classic American attire (e.g., fedora, suit for male; victory rolls haircut, tailored dress for female). Dramatic lighting, 8k, strict facial consistency, isolated on a plain vintage studio background.",
      "Classic 1920s European old money style portrait. Black and white, sepia tone, analog camera grain. Features the subject from reference image, matching their actual age. Wearing roaring twenties European fashion (e.g., flapper style or tailored tweed suit). Elegant pose, 8k, strict facial consistency, isolated on a period-accurate plain interior background.",
      "Candid 1990s color snapshot photograph. Slight flash glare, nostalgic color grading, 35mm film grain. Features the subject from reference image, matching their actual age. Wearing casual 90s fashion (e.g., oversized graphic tee, flannel shirt, denim). Relaxed pose, 8k, highly consistent facial features, isolated on a blurry plain 90s room background."
    ]
  },
  cartoonStyle: {
    prompts: [
      "3D animated character portrait in the style of Disney/Pixar. Features the subject from the reference image, recognizable facial structure, big expressive eyes, soft smooth shading, subsurface scattering, subsurface scattering, high-quality rendering, 8k, cute and friendly appearance, isolated on a simple pastel background.",
      "Adorable 3D caricature vinyl toy style of the person in the reference image. Exaggerated big head, small body, cute proportions. Maintains key facial features for recognition. Shiny plastic texture, vibrant colors, soft studio lighting, 8k, isolated on white background, automatic background remover ready.",
      "High-quality 3D anime style render of the subject from reference image. Vibrant cel-shaded look, large detailed anime eyes, stylized hair, maintaining the identity and facial shape of the reference person. Dynamic lighting, 8k resolution, sharp details, isolated on a plain light background."
    ]
  },
  watercolourSketch: {
    prompts: [
      "Artistic portrait painting of the subject from reference image using watercolor medium. Realistic facial details preserved, surrounded by loose colorful watercolor splashes, drips, and transparent wash effects on textured paper. 8k, vibrant colors, maintaining identity, isolated on white paper background.",
      "Mixed media portrait of the person in the reference image. Detailed charcoal pencil sketch for facial features providing sharp recognition, combined with subtle watercolor paint washes for skin tone and clothing. Raw sketchbook aesthetic, 8k, highly consistent face, isolated on white textured paper.",
      "Masterpiece full color watercolor painting of the subject from reference image. Impasto watercolor style, rich pigments, blending colors, realistic likeness but completely rendered in paint. Fine art aesthetic, 8k, sharp focus on the painted eyes, isolated on a clean white background."
    ]
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { invoiceNumber, conceptKey, base64ImageRaw } = req.body;

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Cek & Kurangi Token
    const { data: invoiceData, error: fetchError } = await supabase
      .from('invoices')
      .select('tokens, id')
      .eq('invoice_number', invoiceNumber)
      .single();

    if (fetchError || !invoiceData) {
      return res.status(404).json({ error: 'Invoice tidak valid.' });
    }

    if (invoiceData.tokens <= 0) {
      return res.status(403).json({ error: 'Kuota token habis (0).' });
    }

    // Kurangi token 1
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ tokens: invoiceData.tokens - 1 })
      .eq('id', invoiceData.id);

    if (updateError) throw updateError;

    // 2. Generate Image via API Eksternal (Gemini)
    const base64Data = base64ImageRaw.split(',')[1];
    const mimeType = base64ImageRaw.split(';')[0].split(':')[1];
    
    // PENTING: Ambil prompt dari dalam objek menggunakan .prompts
    const prompts = CONCEPTS[conceptKey].prompts; 
    const results = [];

    // MENGGUNAKAN MODEL TERBARU
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${process.env.GEMINI_API_KEY}`;

    // Loop untuk 3 gambar
    for (let i = 0; i < prompts.length; i++) {
      const payload = {
        contents: [{
          parts: [
            { text: prompts[i] },
            { inlineData: { mimeType: mimeType, data: base64Data } }
          ]
        }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // ERROR HANDLING UNTUK API GOOGLE
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error from Google:", errorText);
        let errorMsg = "Gagal memproses gambar dari AI.";
        try {
          errorMsg = JSON.parse(errorText).error.message;
        } catch(e) {}
        return res.status(response.status).json({ error: errorMsg });
      }

      const responseData = await response.json();
      const generatedBase64 = responseData.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      
      if (generatedBase64) {
        results.push(`data:image/jpeg;base64,${generatedBase64}`);
      } else {
        results.push(null);
      }
    }

    // Kembalikan sisa token terbaru dan gambar hasil generate
    return res.status(200).json({ 
      success: true, 
      images: results, 
      remainingTokens: invoiceData.tokens - 1 
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Gagal memproses gambar atau server error internal.' });
  }
}
