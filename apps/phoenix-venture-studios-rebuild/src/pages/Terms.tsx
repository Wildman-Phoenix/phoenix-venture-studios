import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const updatedDate = "May 23, 2026";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <section className="gradient-subtle py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <FileText className="mr-2 h-4 w-4" />
              Terms of Service
            </div>
            <h1 className="mt-6 font-heading text-3xl font-bold text-foreground md:text-5xl">
              Directional information, founder tools, and studio services with clear boundaries.
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">
              These terms describe how Phoenix Venture Studios provides educational content, founder
              tools, newsletter communication, and service inquiry workflows through this site.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">Last updated: {updatedDate}</p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-8 rounded-3xl border border-border bg-card p-8 shadow-sm md:p-10">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-foreground">Use of the site</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                You may use Phoenix Venture Studios for lawful informational, educational, and business
                inquiry purposes. You may not misuse forms, attempt to disrupt the site, scrape protected
                systems, or represent Phoenix content as your own.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-foreground">No guaranteed outcomes</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Content on this site is educational and directional. It is not legal, financial, tax,
                or investment advice, and Phoenix Venture Studios does not guarantee funding approval,
                revenue results, implementation outcomes, or business performance.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-foreground">Intellectual property</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Phoenix-owned copy, layouts, generated signal cards, and other site assets remain the
                property of Phoenix Venture Studios unless a separate written agreement says otherwise.
                Source articles and publisher brands remain the property of their respective owners.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-foreground">Third-party services</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                This site may link to third-party services or rely on third-party infrastructure,
                including Supabase, Cloudflare, and email delivery services. Phoenix Venture Studios
                is not responsible for third-party service outages, content, or policy changes.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-foreground">Service inquiries</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Submitting a form or requesting a conversation does not create a client relationship.
                Any consulting, implementation, or studio engagement requires separate agreement on
                scope, pricing, deliverables, and timeline.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <Link to="/contact">
                <Button className="btn-primary">Request studio support</Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="btn-outline-gold">Return Home</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
