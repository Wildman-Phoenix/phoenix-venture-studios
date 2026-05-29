import ScrollReveal from "@/components/ScrollReveal";
import phoenixTexture from "@/assets/phoenix-texture.jpg";

const WhyPhoenix = () => (
  <section className="relative py-24 md:py-32 overflow-hidden">
    <div className="absolute inset-0">
      <img src={phoenixTexture} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-foreground/90" />
    </div>
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <ScrollReveal>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-background mb-8">
            Why <span className="text-primary">Phoenix</span> Venture Studios
          </h2>
          <p className="text-background/70 leading-relaxed mb-5 text-lg">
            Phoenix exists to help founders move through noisy moments with more clarity, stronger positioning, and a steadier next step.
          </p>
          <p className="text-background/60 leading-relaxed mb-5">
            The phoenix symbolizes resilience, reinvention, and renewed momentum, but the work itself is practical. Read the signal, understand what it means for your business, and choose the next move with better context than you had before.
          </p>
          <blockquote className="text-2xl md:text-3xl font-heading font-bold text-primary italic my-8">
            "Every setback is a setup for a comeback."
          </blockquote>
          <p className="text-background/50 leading-relaxed text-sm">
            Founded by entrepreneur Nathan Wildman, Phoenix Venture Studios supports founders, operators, and business owners who want a more premium, better-informed path through AI shifts, funding questions, and growth decisions.
          </p>
        </div>
      </ScrollReveal>
    </div>
  </section>
);

export default WhyPhoenix;
