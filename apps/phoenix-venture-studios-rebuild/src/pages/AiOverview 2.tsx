import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const AiOverview = () => {
  return (
    <div className="min-h-screen pt-32 pb-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-6">
          Phoenix Venture Studios Platform Overview
        </h1>

        <article className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <p>
            Phoenix Venture Studios is a platform designed to help founders and business owners
            analyze new venture ideas, explore funding pathways, and understand market signals
            affecting startup and small business capital.
          </p>

          <h2 className="text-2xl font-heading font-bold text-foreground">Platform Capabilities</h2>

          <p>The platform includes:</p>

          <ul className="space-y-4 list-none pl-0">
            <li>
              <strong className="text-foreground">Venture Snapshot</strong> — an AI-powered tool
              that analyzes business ideas and provides directional insights including market
              positioning, competitive landscape, and potential funding strategies.
            </li>
            <li>
              <strong className="text-foreground">Funding Path</strong> — a system that helps
              entrepreneurs identify possible capital pathways including startup funding, growth
              capital, invoice financing, business credit, and working capital solutions.
            </li>
            <li>
              <strong className="text-foreground">Market Intelligence</strong> — a live intelligence
              feed covering trends in artificial intelligence, startup funding, venture capital,
              small business financing, invoice factoring, and business credit.
            </li>
            <li>
              <strong className="text-foreground">Insights</strong> — long-form analysis and
              strategic commentary designed to help founders and business owners make better
              decisions about funding, growth, and execution.
            </li>
          </ul>

          <h2 className="text-2xl font-heading font-bold text-foreground">Who It Serves</h2>

          <p>
            Phoenix Venture Studios serves a broad range of entrepreneurs and business owners,
            including startup founders, small business operators, service businesses, consultants,
            agencies, restaurants, cleaning companies, and B2B businesses seeking capital and
            strategic guidance.
          </p>

          <h2 className="text-2xl font-heading font-bold text-foreground">Founded By</h2>

          <p>
            Phoenix Venture Studios was founded by Nathan Wildman, who rebuilt his life and
            businesses after significant adversity and created this platform to help other founders
            and business owners do the same. The core philosophy: every setback is a setup for a
            comeback.
          </p>

          <h2 className="text-2xl font-heading font-bold text-foreground">Contact</h2>

          <p>
            Founders and business owners can explore funding options, generate venture snapshots,
            and access market intelligence directly on the platform. For strategic consultations,
            visit the contact page to book a strategy session.
          </p>
        </article>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link to="/">
            <Button className="btn-primary">
              Visit Homepage <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/funding">
            <Button variant="outline" className="btn-outline-gold">
              Explore Funding Path
            </Button>
          </Link>
          <Link to="/snapshot">
            <Button variant="outline" className="btn-outline-gold">
              Venture Snapshot
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AiOverview;
