export interface Feature {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  icon: string; // strict string to map to icon component
  content: {
    heroTitle: string;
    heroDescription: string;
    howTo: { title: string; steps: string[] };
    benefits: { title: string; description: string }[];
    faq: { question: string; answer: string }[];
  };
}

export const FEATURES: Feature[] = [
  {
    slug: 'crop',
    title: 'Free Online Image Cropper - Crop Photos Instantly | Onyx',
    description: 'The best free online image cropper. Crop photos for Instagram, Facebook, and Twitter with preset aspect ratios. Private, fast, and no quality loss.',
    keywords: ['crop image', 'online image cropper', 'crop photo free', 'resize image', 'photo editor', 'crop for instagram', 'square crop', '16:9 crop', 'circle crop'],
    icon: 'crop',
    content: {
      heroTitle: 'Crop Images Online for Free',
      heroDescription: 'Transform your photos with our advanced cropping tool. Whether you need a square for Instagram, a 16:9 for YouTube, or a custom size, Onyx makes it easy. 100% private, no uploads required.',
      howTo: {
        title: 'How to Crop an Image in 3 Steps',
        steps: [
          'Upload your photo to Onyx or drag and drop it onto the canvas.',
          'Select the "Crop" tool from the sidebar and choose a preset ratio (Original, Square, 16:9, etc.) or drag the handles freely.',
          'Click the checkmark or "Apply" to finalize your crop, then export your perfectly compositioned image.'
        ]
      },
      benefits: [
        { title: 'Social Media Ready', description: 'Includes built-in presets for Instagram Posts (1:1), Stories (9:16), YouTube Thumbnails (16:9), and more.' },
        { title: 'Privacy Guaranteed', description: 'Unlike other tools, your images are processed entirely on your device. Nothing is ever uploaded to a server.' },
        { title: 'Lossless Editing', description: 'Our smart cropping algorithm ensures your image stays sharp and clear, pixel for pixel.' },
        { title: 'Custom Aspect Ratios', description: 'Need a specific dimension? Type in exact pixel values or aspect ratios for precise control.' }
      ],
      faq: [
        { question: 'How do I crop a photo into a circle?', answer: 'Use our "Mask" tool instead of standard crop. Select the "Circle" shape mask to instantly create a round image perfect for profile pictures.' },
        { question: 'Can I crop multiple images at once?', answer: 'Currently, Onyx focuses on perfecting one image at a time to ensure maximum quality and control.' },
        { question: 'What file formats can I crop?', answer: 'We support all major formats including JPG, PNG, WebP, and even PDF pages.' },
        { question: 'Is there a watermark?', answer: 'Never. Onyx is completely free and adds no watermarks to your exported images.' }
      ]
    }
  },
  {
    slug: 'resize',
    title: 'Resize Image Online - Free Photo Resizer | Onyx',
    description: 'Resize images online instantly. Change dimensions, file size, and aspect ratio without losing quality. Free and private.',
    keywords: ['resize image', 'photo resizer', 'image scaler', 'reduce image size', 'online resizer', 'change image resolution', 'resize jpg'],
    icon: 'resize',
    content: {
      heroTitle: 'Resize Images Online',
      heroDescription: 'Easily change image dimensions and scale photos for web, social media, or print. Fast, secure, and pixel-perfect resizing.',
      howTo: {
        title: 'How to Resize an Image',
        steps: [
          'Upload your photo to the editor.',
          'Use the resize handles or enter exact pixel dimensions.',
          'Maintain aspect ratio to prevent distortion.',
          'Export your resized image instantly.'
        ]
      },
      benefits: [
        { title: 'Pixel Perfect', description: 'Resize with precision using our advanced scaling algorithms.' },
        { title: 'Batch Processing', description: 'Resize multiple images in separate tabs efficiently.' },
        { title: 'Web Optimized', description: 'Get the perfect size for your website or blog to improve loading speeds.' }
      ],
      faq: [
        { question: 'How do I resize an image without losing quality?', answer: 'Onyx uses high-quality resampling to minimize quality loss when resizing.' },
        { question: 'Can I resize multiple images?', answer: 'You can work on multiple projects simultaneously in Onyx.' },
        { question: 'What formats are supported?', answer: 'We support JPG, PNG, WebP, and more.' }
      ]
    }
  },
  {
    slug: 'filters',
    title: 'Online Photo Filters - Add Effects to Images | Onyx',
    description: 'Apply stunning filters and effects to your photos. Vintage, B&W, Sepia, and more. Enhance your images instantly online.',
    keywords: ['photo filters', 'image effects', 'online photo editor', 'instagram filters', 'vintage filter', 'retro photo effects', 'color enhancement'],
    icon: 'filter',
    content: {
      heroTitle: 'Add Stunning Filters to Photos',
      heroDescription: 'Transform your images with a wide range of professional filters. From vintage looks to modern aesthetic enhancements.',
      howTo: {
        title: 'How to Add Filters',
        steps: [
          'Upload your image to Onyx.',
          'Select the image to open the properties panel.',
          'Choose from a variety of filters like Grayscale, Sepia, or Vintage.',
          'Adjust intensity and combine multiple filters for a unique look.'
        ]
      },
      benefits: [
        { title: 'Instant Preview', description: 'See changes in real-time as you apply filters.' },
        { title: 'Customizable', description: 'Fine-tune each filter to get the exact look you want.' },
        { title: 'Professional Presets', description: 'Use our curated collection of presets for quick edits.' }
      ],
      faq: [
        { question: 'Can I combine multiple filters?', answer: 'Yes, you can stack multiple filters to create unique effects.' },
        { question: 'Are the filters free?', answer: 'All filters are available for free with no hidden costs.' },
        { question: 'Do I need to install anything?', answer: 'No, everything runs in your browser.' }
      ]
    }
  },
  {
    slug: 'blur',
    title: 'Blur Image Online - Blur Background & Faces | Onyx',
    description: 'Blur images online for free. Blur faces, backgrounds, or specific areas instantly. Privacy-focused photo blur tool.',
    keywords: ['blur image', 'blur photo', 'blur background', 'blur face', 'online blur tool', 'censor photo', 'blur effect'],
    icon: 'filter',
    content: {
      heroTitle: 'Blur Images Online',
      heroDescription: 'Easily apply blur effects to your photos. Create depth of field, hide sensitive information, or add artistic softness.',
      howTo: {
        title: 'How to Blur an Image',
        steps: [
          'Upload your photo to Onyx.',
          'Select the image and go to the filters section.',
          'Choose the "Blur" filter.',
          'Adjust the blur intensity slider to your desired level.'
        ]
      },
      benefits: [
        { title: 'Privacy Protection', description: 'Blur faces or sensitive text to protect privacy before sharing.' },
        { title: 'Artistic Effects', description: 'Create dreamy, soft-focus looks with adjustable blur.' },
        { title: 'Focus Control', description: 'Simulate depth of field by blurring specific elements (via masking or layers).' }
      ],
      faq: [
        { question: 'Can I blur only part of an image?', answer: 'Yes, you can use masking or duplicate layers to blur specific areas.' },
        { question: 'Is the blur reversible?', answer: 'Yes, you can remove or adjust the blur filter at any time before exporting.' },
        { question: 'Is it free?', answer: 'Yes, the blur tool is completely free.' }
      ]
    }
  },
  {
    slug: 'grayscale',
    title: 'Black and White Photo Editor - Grayscale Filter | Onyx',
    description: 'Convert color photos to black and white online. Apply grayscale filters instantly. Create dramatic monochrome images.',
    keywords: ['black and white photo editor', 'grayscale image', 'convert to black and white', 'monochrome filter', 'grayscale converter'],
    icon: 'filter',
    content: {
      heroTitle: 'Convert Photos to Black & White',
      heroDescription: 'Instantly transform your color photos into stunning black and white images. Add drama and elegance with our grayscale filter.',
      howTo: {
        title: 'How to Make an Image Black and White',
        steps: [
          'Upload your color photo.',
          'Select the image to reveal editing tools.',
          'Apply the "Grayscale" filter or reduce Saturation to -100.',
          'Adjust contrast and brightness to perfect the look.'
        ]
      },
      benefits: [
        { title: 'Classic Look', description: 'Give your photos a timeless, classic feel with monochrome conversion.' },
        { title: 'Fine Tuning', description: 'Adjust brightness and contrast to get the perfect black and white balance.' },
        { title: 'Instant Conversion', description: 'One-click transformation with zero wait time.' }
      ],
      faq: [
        { question: 'Is it true black and white?', answer: 'Yes, it removes all color information for a true grayscale image.' },
        { question: 'Can I add a tint?', answer: 'Yes, you can use other filters like Sepia or overlay colors to add a tint.' },
        { question: 'Does it affect resolution?', answer: 'No, the resolution remains unchanged.' }
      ]
    }
  },
  {
    slug: 'flip',
    title: 'Flip Image Online - Mirror Photo Horizontally & Vertically | Onyx',
    description: 'Flip images online for free. Mirror photos horizontally or vertically. Create reflection effects instantly.',
    keywords: ['flip image', 'mirror image', 'flip photo', 'mirror effect', 'reverse image', 'flip horizontally'],
    icon: 'flip',
    content: {
      heroTitle: 'Flip and Mirror Images',
      heroDescription: 'Easily flip your images horizontally or vertically. Correct orientation or create artistic reflection effects.',
      howTo: {
        title: 'How to Flip an Image',
        steps: [
          'Upload your image to the editor.',
          'Select the image you want to flip.',
          'Click "Flip Horizontal" or "Flip Vertical" in the toolbar.',
          'Export your mirrored image.'
        ]
      },
      benefits: [
        { title: 'Instant Correction', description: 'Fix selfies that are mirrored or upside down instantly.' },
        { title: 'Creative Reflections', description: 'Duplicate and flip images to create symmetrical patterns and reflections.' },
        { title: 'Zero Quality Loss', description: 'Flipping is a lossless operation in our editor.' }
      ],
      faq: [
        { question: 'Can I flip text too?', answer: 'Yes, you can flip any element, including text and shapes.' },
        { question: 'Is it reversible?', answer: 'Yes, simply click flip again to return to the original state.' },
        { question: 'Does it work on mobile?', answer: 'Yes, Onyx works perfectly on mobile browsers.' }
      ]
    }
  },
  {
    slug: 'add-text',
    title: 'Add Text to Photo - Online Image Text Editor | Onyx',
    description: 'Add text to images with custom fonts, colors, and styles. Create memes, social media posts, and banners online for free.',
    keywords: ['add text to photo', 'text on image', 'meme maker', 'font editor', 'image caption', 'watermark photo'],
    icon: 'text',
    content: {
      heroTitle: 'Add Text to Photos Online',
      heroDescription: 'Easily add captions, quotes, and text overlays to your images. Choose from hundreds of Google Fonts.',
      howTo: {
        title: 'How to Add Text',
        steps: [
          'Open your image in the editor.',
          'Click the "Text" tool to add a text layer.',
          'Type your message and customize font, size, and color.',
          'Drag to position and export your creation.'
        ]
      },
      benefits: [
        { title: 'Huge Font Library', description: 'Access the entire Google Fonts library directly in the editor.' },
        { title: 'Full Customization', description: 'Adjust line height, letter spacing, shadow, and stroke.' },
        { title: 'Layer Management', description: 'Manage text layers easily with our intuitive layers panel.' }
      ],
      faq: [
        { question: 'Can I upload my own fonts?', answer: 'Currently we support Google Fonts which offers thousands of options.' },
        { question: 'Is it good for making memes?', answer: 'Yes! It is perfect for creating memes and social media content.' },
        { question: 'Can I add shadows to text?', answer: 'Yes, you can add customizable drop shadows to your text.' }
      ]
    }
  },
  {
    slug: 'masking',
    title: 'Image Masking Online - Clip Photos into Shapes | Onyx',
    description: 'Mask images into shapes like circles, hearts, and stars. Create custom shaped photos for profiles and designs online.',
    keywords: ['image masking', 'photo mask', 'circle crop', 'shape crop', 'clip image', 'round profile picture'],
    icon: 'mask',
    content: {
      heroTitle: 'Mask Images into Shapes',
      heroDescription: 'Turn your rectangular photos into circles, hearts, stars, and more with our easy masking tool.',
      howTo: {
        title: 'How to Mask an Image',
        steps: [
          'Select your image on the canvas.',
          'Choose a mask shape (Circle, Heart, Star, etc.).',
          'Adjust the mask position and size.',
          'Apply the mask to clip your image.'
        ]
      },
      benefits: [
        { title: 'Creative Shapes', description: 'Go beyond rectangles with creative shape masks.' },
        { title: 'Non-Destructive', description: 'The mask is applied as a clip path, preserving the original image data.' },
        { title: 'Perfect for Profiles', description: 'Create perfect circle profile pictures instantly.' }
      ],
      faq: [
        { question: 'Can I remove the mask later?', answer: 'Yes, you can remove or adjust the mask at any time.' },
        { question: 'What shapes are available?', answer: 'We offer Circle, Rectangle, Triangle, Heart, and Star shapes.' },
        { question: 'Is it free?', answer: 'Yes, image masking is a free feature in Onyx.' }
      ]
    }
  },
  {
    slug: 'shapes',
    title: 'Add Shapes to Photo - Overlay Shapes Online | Onyx',
    description: 'Add shapes to your photos online. Insert rectangles, circles, stars, and more. Customize color, border, and transparency.',
    keywords: ['add shapes to photo', 'overlay shapes', 'draw shapes', 'photo decoration', 'circle overlay'],
    icon: 'draw',
    content: {
      heroTitle: 'Add Shapes to Photos',
      heroDescription: 'Enhance your images with geometric shapes. Add rectangles, circles, triangles, and more with full customization.',
      howTo: {
        title: 'How to Add Shapes',
        steps: [
          'Open your image in Onyx.',
          'Select the "Shape" tool from the menu.',
          'Choose a shape (Rectangle, Circle, etc.) to add it to the canvas.',
          'Customize the fill color, stroke, and opacity.'
        ]
      },
      benefits: [
        { title: 'Fully Customizable', description: 'Change colors, add borders, adjust opacity, and resize freely.' },
        { title: 'Layer Support', description: 'Stack shapes behind or in front of other elements using layers.' },
        { title: 'Vector Quality', description: 'Shapes are vector-based, ensuring they remain crisp at any size.' }
      ],
      faq: [
        { question: 'Can I make the shape transparent?', answer: 'Yes, you can adjust the opacity or choose a transparent fill with a colored border.' },
        { question: 'Can I rotate shapes?', answer: 'Yes, all shapes can be rotated and resized easily.' },
        { question: 'What shapes are available?', answer: 'We provide standard shapes like rectangles, circles, and triangles.' }
      ]
    }
  },
  {
    slug: 'draw',
    title: 'Draw on Image - Free Online Drawing Tool | Onyx',
    description: 'Draw on photos online with freehand brush and highlighter. Annotate images, highlight text, and doodle freely.',
    keywords: ['draw on image', 'annotate photo', 'highlight text', 'online drawing', 'scribble on photo', 'paint on image'],
    icon: 'draw',
    content: {
      heroTitle: 'Draw and Annotate Images',
      heroDescription: 'Unleash your creativity by drawing directly on your photos. Use the pencil for details or highlighter for emphasis.',
      howTo: {
        title: 'How to Draw on an Image',
        steps: [
          'Upload your image.',
          'Select the "Draw" tool from the toolbar.',
          'Choose your brush size and color.',
          'Start drawing freely on the canvas.'
        ]
      },
      benefits: [
        { title: 'Smooth Strokes', description: 'Experience smooth, responsive drawing with pressure simulation.' },
        { title: 'Highlighter Mode', description: 'Use the highlighter to emphasize important parts of documents.' },
        { title: 'Custom Colors', description: 'Pick any color from the spectrum for your brush.' }
      ],
      faq: [
        { question: 'Can I undo my drawing?', answer: 'Yes, you can undo each stroke individually.' },
        { question: 'Does it support tablets?', answer: 'Yes, Onyx works great on touch devices and tablets.' },
        { question: 'Can I save the drawing?', answer: 'Yes, export your image with the drawing as a PNG or JPG.' }
      ]
    }
  },
  {
    slug: 'rotate',
    title: 'Rotate Image Online - Flip & Turn Photos | Onyx',
    description: 'Rotate images 90 degrees, 180 degrees, or custom angles. Flip photos horizontally or vertically online for free.',
    keywords: ['rotate image', 'flip photo', 'mirror image', 'turn photo', 'image orientation', 'fix photo angle'],
    icon: 'rotate',
    content: {
      heroTitle: 'Rotate and Flip Images',
      heroDescription: 'Correct your photo orientation instantly. Rotate left, right, or flip horizontally and vertically.',
      howTo: {
        title: 'How to Rotate an Image',
        steps: [
          'Upload your photo.',
          'Select the image.',
          'Use the rotate buttons to turn 90 degrees.',
          'Or use the handle to rotate to a custom angle.'
        ]
      },
      benefits: [
        { title: 'One-Click Actions', description: 'Rotate and flip with single clicks for fast editing.' },
        { title: 'Precision Control', description: 'Rotate to any specific angle for perfect alignment.' },
        { title: 'Mirror Effect', description: 'Create cool mirror effects by flipping and duplicating images.' }
      ],
      faq: [
        { question: 'Can I flip images?', answer: 'Yes, you can flip images both horizontally and vertically.' },
        { question: 'Does it affect quality?', answer: 'Rotation is lossless in the editor until you export.' },
        { question: 'Can I rotate multiple items?', answer: 'Yes, you can select and rotate multiple objects at once.' }
      ]
    }
  },
  {
    slug: 'convert',
    title: 'Image Converter - Convert JPG to PNG & More | Onyx',
    description: 'Convert images between formats online. Save as PNG, JPG, or JSON project files. Free online image converter.',
    keywords: ['image converter', 'jpg to png', 'png to jpg', 'convert image format', 'save as pdf', 'webp to jpg'],
    icon: 'convert',
    content: {
      heroTitle: 'Convert Image Formats',
      heroDescription: 'Easily convert your images to different formats. Export your projects as high-quality PNG or JPG files.',
      howTo: {
        title: 'How to Convert an Image',
        steps: [
          'Open your image in Onyx.',
          'Make any necessary edits or leave as is.',
          'Click the "Export" or "Save" button.',
          'Choose your desired format (PNG, JPG) and quality.'
        ]
      },
      benefits: [
        { title: 'High Quality Export', description: 'Control the quality of your output file to balance size and clarity.' },
        { title: 'Transparent Backgrounds', description: 'Convert to PNG to preserve transparency.' },
        { title: 'Fast Processing', description: 'Conversion happens instantly in your browser.' }
      ],
      faq: [
        { question: 'Can I convert WebP to JPG?', answer: 'Yes, simply upload the WebP and export as JPG.' },
        { question: 'Is it secure?', answer: 'Yes, your files are processed locally and never uploaded to a server.' },
        { question: 'Can I convert to PDF?', answer: 'Currently we support image formats, but PDF export is coming soon.' }
      ]
    }
  }
];
