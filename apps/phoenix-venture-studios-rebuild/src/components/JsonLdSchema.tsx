import { useEffect } from "react";

interface JsonLdProps {
  schema: Record<string, unknown> | Record<string, unknown>[];
}

const JsonLdSchema = ({ schema }: JsonLdProps) => {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(schema);
    script.setAttribute("data-jsonld", "true");
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [schema]);

  return null;
};

export default JsonLdSchema;
