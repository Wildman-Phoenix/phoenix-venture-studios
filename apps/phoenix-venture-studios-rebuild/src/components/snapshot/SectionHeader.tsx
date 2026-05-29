import { LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  number: number;
  title: string;
  description: string;
  hint?: string;
  icon: LucideIcon;
}

const SectionHeader = ({ number, title, description, hint, icon: Icon }: SectionHeaderProps) => (
  <div className="mb-6 pb-4 border-b border-border/50">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
        {number}
      </div>
      <Icon className="h-5 w-5 text-primary/70" />
      <h3 className="text-lg font-heading font-semibold text-foreground">{title}</h3>
    </div>
    <p className="text-sm text-muted-foreground leading-relaxed pl-11">{description}</p>
    {hint && (
      <p className="text-xs text-muted-foreground/60 mt-1 pl-11 italic">{hint}</p>
    )}
  </div>
);

export default SectionHeader;
