import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { href: "/founder-signal", label: "Founder Signal" },
    { href: "/funding", label: "Funding Paths" },
    { href: "/studio", label: "Studio Services" },
  ];

  const secondaryLinks = [
    { href: "/market-intelligence", label: "Signal Archive" },
    { href: "/about", label: "About" },
  ];

  const isActive = (href: string) => {
    if (href === "/founder-signal") {
      return location.pathname === href || location.pathname.startsWith("/founder-signal/");
    }
    if (href === "/market-intelligence") {
      return location.pathname === href || location.pathname.startsWith("/intelligence/");
    }
    return location.pathname === href;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center space-x-2" aria-label="Phoenix Venture Studios home">
            <span className="text-xl md:text-2xl font-heading font-bold text-foreground">
              Phoenix<span className="text-primary">Venture</span>
              <span className="text-muted-foreground text-sm md:text-base font-body font-normal ml-1">Studios</span>
            </span>
          </Link>

          <div className="hidden xl:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive(link.href)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden xl:flex items-center gap-2">
            <Link to="/founder-signal">
              <Button className="btn-primary">Subscribe</Button>
            </Link>
            <Link to="/market-intelligence">
              <Button variant="ghost" className="text-foreground hover:text-primary">Read signals</Button>
            </Link>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="xl:hidden p-2 rounded-lg hover:bg-secondary"
            aria-label={isOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {isOpen && (
          <div id="mobile-navigation" className="xl:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive(link.href)
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 border-t border-border pt-2">
                {secondaryLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`block rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <Link to="/founder-signal" onClick={() => setIsOpen(false)}>
                <Button className="btn-primary w-full mt-4">Subscribe to Founder Signal</Button>
              </Link>
              <Link to="/market-intelligence" onClick={() => setIsOpen(false)}>
                <Button variant="outline" className="btn-outline-gold w-full">Read current signals</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
