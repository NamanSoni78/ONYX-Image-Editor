import React from 'react';

interface JsonLdProps {
  data: Record<string, any> | Record<string, any>[];
}

const JsonLd: React.FC<JsonLdProps> = ({ data }) => {
  const schemas = Array.isArray(data) ? data : [data];

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
};

export default JsonLd;
