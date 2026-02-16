export interface WebSiteSchema {
  "@context": "https://schema.org";
  "@type": "WebSite";
  name: string;
  url: string;
  potentialAction: {
    "@type": "SearchAction";
    target: string;
    "query-input": string;
  };
}

export interface OrganizationSchema {
  "@context": "https://schema.org";
  "@type": "Organization";
  name: string;
  url: string;
  logo: string;
  sameAs: string[];
}

export interface SoftwareApplicationSchema {
  "@context": "https://schema.org";
  "@type": "SoftwareApplication";
  name: string;
  applicationCategory: string;
  operatingSystem: string;
  offers: {
    "@type": "Offer";
    price: string;
    priceCurrency: string;
  };
  description: string;
}

export interface FAQPageSchema {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: {
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }[];
}

export interface BreadcrumbListSchema {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: {
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }[];
}

export interface HowToSchema {
  "@context": "https://schema.org";
  "@type": "HowTo";
  name: string;
  step: {
    "@type": "HowToStep";
    position: number;
    name: string;
    text: string;
  }[];
}

export interface ArticleSchema {
  "@context": "https://schema.org";
  "@type": "Article";
  headline: string;
  image: string;
  author: {
    "@type": "Person";
    name: string;
  };
  publisher: {
    "@type": "Organization";
    name: string;
    logo: {
      "@type": "ImageObject";
      url: string;
    };
  };
  datePublished: string;
  dateModified: string;
  description: string;
  mainEntityOfPage: {
    "@type": "WebPage";
    "@id": string;
  };
}

export const generateWebSiteSchema = (): WebSiteSchema => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Onyx Image Editor",
  url: "https://onyx.namansoni.in",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://onyx.namansoni.in/search?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
});

export const generateOrganizationSchema = (): OrganizationSchema => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Onyx Image Editor",
  url: "https://onyx.namansoni.in",
  logo: "https://onyx.namansoni.in/logo.png",
  sameAs: [
    "https://twitter.com/onyxeditor",
    "https://github.com/namansoni/onyx",
  ],
});

export const generateSoftwareApplicationSchema = (
  name: string,
  desc: string
): SoftwareApplicationSchema => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description: desc,
});

export const generateFAQSchema = (faqs: { question: string; answer: string }[]): FAQPageSchema => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});

export const generateBreadcrumbSchema = (
  items: { name: string; url: string }[]
): BreadcrumbListSchema => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

export const generateHowToSchema = (steps: string[]): HowToSchema => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Edit Image",
  step: steps.map((step, index) => ({
    "@type": "HowToStep",
    position: index + 1,
    name: `Step ${index + 1}`,
    text: step,
  })),
});

export const generateArticleSchema = (post: any): ArticleSchema => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: post.title,
  image: `https://onyx.namansoni.in${post.image}`,
  author: {
    "@type": "Person",
    name: post.author,
  },
  publisher: {
    "@type": "Organization",
    name: "Onyx Image Editor",
    logo: {
      "@type": "ImageObject",
      url: "https://onyx.namansoni.in/logo.png",
    },
  },
  datePublished: post.date,
  dateModified: post.date,
  description: post.excerpt,
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": `https://onyx.namansoni.in/blog/${post.slug}`,
  },
});
