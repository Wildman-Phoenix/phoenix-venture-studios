import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          <div className="md:col-span-2">
            <Link to="/" className="inline-block">
              <span className="text-2xl font-heading font-bold">
                Phoenix<span className="text-primary">Venture</span>
                <span className="text-background/60 text-base font-body font-normal ml-1">Studios</span>
              </span>
            </Link>
            <p className="mt-2 text-sm italic text-primary/80">
              Every setback is a setup for a comeback.
            </p>
            <p className="mt-4 text-sm text-background/70 max-w-md leading-relaxed">
              Founder Signal, public market reads, funding direction, and studio support
              for entrepreneurs who want the signal before the next move.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/founder-signal" className="text-sm text-background/70 hover:text-primary transition-colors">
                  Subscribe to Founder Signal
                </Link>
              </li>
              <li>
                <Link to="/market-intelligence" className="text-sm text-background/70 hover:text-primary transition-colors">
                  Read current signals
                </Link>
              </li>
              <li>
                <Link to="/funding" className="text-sm text-background/70 hover:text-primary transition-colors">
                  Explore funding paths
                </Link>
              </li>
              <li>
                <Link to="/studio" className="text-sm text-background/70 hover:text-primary transition-colors">
                  Studio Services
                </Link>
              </li>
              <li>
                <Link to="/contact?intent=studio" className="text-sm text-background/70 hover:text-primary transition-colors">
                  Request studio support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-lg mb-4">Our Promise</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li>✓ Your concepts remain yours</li>
              <li>✓ Clear founder-first communication</li>
              <li>✓ Privacy-minded communication</li>
              <li>✓ No guaranteed funding claims</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-background/10">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-background/60">
              © {currentYear} Phoenix Venture Studios. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <Link to="/privacy" className="text-sm text-background/60 hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-sm text-background/60 hover:text-primary transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
          <p className="mt-4 text-xs text-background/40 text-center md:text-left">
            Disclaimer: Information provided on this platform is for educational and directional purposes only. 
            It does not constitute legal, financial, or investment advice. No funding approval is guaranteed.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
