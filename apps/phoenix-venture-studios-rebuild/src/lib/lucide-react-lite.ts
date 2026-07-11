import { createElement, forwardRef } from "react";
import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";

export interface LucideProps extends SVGProps<SVGSVGElement> {
  size?: string | number;
  absoluteStrokeWidth?: boolean;
}

export type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

type IconShape =
  | "activity"
  | "arrow-left"
  | "arrow-right"
  | "bar"
  | "book"
  | "bot"
  | "briefcase"
  | "building"
  | "calendar"
  | "chart"
  | "check"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "chevron-up"
  | "circle"
  | "clock"
  | "compass"
  | "credit-card"
  | "dollar"
  | "file"
  | "globe"
  | "heart"
  | "info"
  | "layers"
  | "lightbulb"
  | "mail"
  | "map-pin"
  | "menu"
  | "message"
  | "panel"
  | "refresh"
  | "rss"
  | "search"
  | "send"
  | "shield"
  | "sparkles"
  | "target"
  | "user"
  | "wand"
  | "workflow"
  | "x"
  | "zap";

function iconChildren(shape: IconShape) {
  switch (shape) {
    case "activity":
      return [["path", { d: "M3 12h4l2-7 4 14 2-7h6" }]];
    case "arrow-left":
      return [["path", { d: "M19 12H5" }], ["path", { d: "m12 19-7-7 7-7" }]];
    case "arrow-right":
      return [["path", { d: "M5 12h14" }], ["path", { d: "m12 5 7 7-7 7" }]];
    case "bar":
      return [["path", { d: "M4 19V9" }], ["path", { d: "M12 19V5" }], ["path", { d: "M20 19v-7" }]];
    case "book":
      return [["path", { d: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" }], ["path", { d: "M4 5.5v16" }]];
    case "bot":
      return [["rect", { x: 5, y: 8, width: 14, height: 10, rx: 2 }], ["path", { d: "M12 8V4" }], ["path", { d: "M8 13h.01" }], ["path", { d: "M16 13h.01" }]];
    case "briefcase":
      return [["rect", { x: 3, y: 7, width: 18, height: 13, rx: 2 }], ["path", { d: "M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }], ["path", { d: "M3 12h18" }]];
    case "building":
      return [["rect", { x: 4, y: 3, width: 16, height: 18, rx: 2 }], ["path", { d: "M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01" }]];
    case "calendar":
      return [["rect", { x: 3, y: 4, width: 18, height: 18, rx: 2 }], ["path", { d: "M16 2v4M8 2v4M3 10h18" }]];
    case "chart":
      return [["path", { d: "M3 3v18h18" }], ["path", { d: "m7 15 4-4 3 3 5-7" }]];
    case "check":
      return [["path", { d: "m5 12 5 5L20 7" }]];
    case "chevron-down":
      return [["path", { d: "m6 9 6 6 6-6" }]];
    case "chevron-left":
      return [["path", { d: "m15 18-6-6 6-6" }]];
    case "chevron-right":
      return [["path", { d: "m9 18 6-6-6-6" }]];
    case "chevron-up":
      return [["path", { d: "m18 15-6-6-6 6" }]];
    case "circle":
      return [["circle", { cx: 12, cy: 12, r: 9 }]];
    case "clock":
      return [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M12 7v5l3 3" }]];
    case "compass":
      return [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "m15 9-2 6-6 2 2-6z" }]];
    case "credit-card":
      return [["rect", { x: 3, y: 5, width: 18, height: 14, rx: 2 }], ["path", { d: "M3 10h18" }]];
    case "dollar":
      return [["path", { d: "M12 2v20" }], ["path", { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" }]];
    case "file":
      return [["path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }], ["path", { d: "M14 2v6h6" }], ["path", { d: "M8 13h8M8 17h5" }]];
    case "globe":
      return [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" }]];
    case "heart":
      return [["path", { d: "M20.8 8.6a5.5 5.5 0 0 0-9-4.2l-.8.8-.8-.8a5.5 5.5 0 1 0-7.8 7.8l8.6 8.6 8.6-8.6a5.5 5.5 0 0 0 1.2-3.6" }]];
    case "info":
      return [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M12 10v6M12 7h.01" }]];
    case "layers":
      return [["path", { d: "m12 2 9 5-9 5-9-5z" }], ["path", { d: "m3 12 9 5 9-5" }], ["path", { d: "m3 17 9 5 9-5" }]];
    case "lightbulb":
      return [["path", { d: "M9 18h6M10 22h4" }], ["path", { d: "M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4z" }]];
    case "mail":
      return [["rect", { x: 3, y: 5, width: 18, height: 14, rx: 2 }], ["path", { d: "m3 7 9 6 9-6" }]];
    case "map-pin":
      return [["path", { d: "M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z" }], ["circle", { cx: 12, cy: 10, r: 2 }]];
    case "menu":
      return [["path", { d: "M4 6h16M4 12h16M4 18h16" }]];
    case "message":
      return [["path", { d: "M21 12a8 8 0 0 1-8 8H6l-4 3 1.5-5A8 8 0 1 1 21 12z" }]];
    case "panel":
      return [["rect", { x: 3, y: 4, width: 18, height: 16, rx: 2 }], ["path", { d: "M9 4v16" }]];
    case "refresh":
      return [["path", { d: "M21 12a9 9 0 0 1-15 6.7L3 16" }], ["path", { d: "M3 12a9 9 0 0 1 15-6.7L21 8" }], ["path", { d: "M3 21v-5h5M21 3v5h-5" }]];
    case "rss":
      return [["path", { d: "M4 11a9 9 0 0 1 9 9" }], ["path", { d: "M4 4a16 16 0 0 1 16 16" }], ["circle", { cx: 5, cy: 19, r: 1 }]];
    case "search":
      return [["circle", { cx: 11, cy: 11, r: 7 }], ["path", { d: "m20 20-4-4" }]];
    case "send":
      return [["path", { d: "m22 2-7 20-4-9-9-4z" }], ["path", { d: "M22 2 11 13" }]];
    case "shield":
      return [["path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }]];
    case "sparkles":
      return [["path", { d: "M12 3 9.5 9.5 3 12l6.5 2.5L12 21l2.5-6.5L21 12l-6.5-2.5z" }], ["path", { d: "M5 3v4M3 5h4M19 17v4M17 19h4" }]];
    case "target":
      return [["circle", { cx: 12, cy: 12, r: 9 }], ["circle", { cx: 12, cy: 12, r: 5 }], ["circle", { cx: 12, cy: 12, r: 1 }]];
    case "user":
      return [["circle", { cx: 12, cy: 8, r: 4 }], ["path", { d: "M4 22a8 8 0 0 1 16 0" }]];
    case "wand":
      return [["path", { d: "M15 4 20 9" }], ["path", { d: "M4 20 20 4" }], ["path", { d: "M14 14 10 10" }]];
    case "workflow":
      return [["rect", { x: 3, y: 4, width: 6, height: 6, rx: 1 }], ["rect", { x: 15, y: 14, width: 6, height: 6, rx: 1 }], ["path", { d: "M9 7h4a3 3 0 0 1 3 3v4" }]];
    case "x":
      return [["path", { d: "M18 6 6 18M6 6l12 12" }]];
    case "zap":
      return [["path", { d: "m13 2-9 13h8l-1 7 9-13h-8z" }]];
    default:
      return [["circle", { cx: 12, cy: 12, r: 9 }]];
  }
}

function createLiteIcon(displayName: string, shape: IconShape = "circle"): LucideIcon {
  const Icon = forwardRef<SVGSVGElement, LucideProps>((props, ref) => {
    const { size = 24, color = "currentColor", strokeWidth = 2, children, ...rest } = props;
    return createElement(
      "svg",
      {
        ref,
        xmlns: "http://www.w3.org/2000/svg",
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: color,
        strokeWidth,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": props["aria-label"] ? undefined : true,
        ...rest,
      },
      ...iconChildren(shape).map(([tag, attrs], index) => createElement(tag, { key: index, ...attrs })),
      children,
    );
  });

  Icon.displayName = displayName;
  return Icon;
}

export const Activity = createLiteIcon("Activity", "activity");
export const AlertCircle = createLiteIcon("AlertCircle", "info");
export const ArrowLeft = createLiteIcon("ArrowLeft", "arrow-left");
export const ArrowRight = createLiteIcon("ArrowRight", "arrow-right");
export const Award = createLiteIcon("Award", "sparkles");
export const Banknote = createLiteIcon("Banknote", "dollar");
export const BarChart3 = createLiteIcon("BarChart3", "bar");
export const BookOpen = createLiteIcon("BookOpen", "book");
export const Bot = createLiteIcon("Bot", "bot");
export const Briefcase = createLiteIcon("Briefcase", "briefcase");
export const BriefcaseBusiness = createLiteIcon("BriefcaseBusiness", "briefcase");
export const Building = createLiteIcon("Building", "building");
export const Building2 = createLiteIcon("Building2", "building");
export const Calendar = createLiteIcon("Calendar", "calendar");
export const Check = createLiteIcon("Check", "check");
export const CheckCircle2 = createLiteIcon("CheckCircle2", "check");
export const CheckSquare = createLiteIcon("CheckSquare", "check");
export const ChevronDown = createLiteIcon("ChevronDown", "chevron-down");
export const ChevronLeft = createLiteIcon("ChevronLeft", "chevron-left");
export const ChevronRight = createLiteIcon("ChevronRight", "chevron-right");
export const ChevronUp = createLiteIcon("ChevronUp", "chevron-up");
export const Circle = createLiteIcon("Circle", "circle");
export const Clock = createLiteIcon("Clock", "clock");
export const Compass = createLiteIcon("Compass", "compass");
export const Cpu = createLiteIcon("Cpu", "bot");
export const CreditCard = createLiteIcon("CreditCard", "credit-card");
export const DollarSign = createLiteIcon("DollarSign", "dollar");
export const Dot = createLiteIcon("Dot", "circle");
export const ExternalLink = createLiteIcon("ExternalLink", "arrow-right");
export const Eye = createLiteIcon("Eye", "circle");
export const FileText = createLiteIcon("FileText", "file");
export const Filter = createLiteIcon("Filter", "bar");
export const Gauge = createLiteIcon("Gauge", "chart");
export const Globe = createLiteIcon("Globe", "globe");
export const GripVertical = createLiteIcon("GripVertical", "bar");
export const HandHeart = createLiteIcon("HandHeart", "heart");
export const Heart = createLiteIcon("Heart", "heart");
export const HelpCircle = createLiteIcon("HelpCircle", "info");
export const Info = createLiteIcon("Info", "info");
export const Layers = createLiteIcon("Layers", "layers");
export const Layers3 = createLiteIcon("Layers3", "layers");
export const Lightbulb = createLiteIcon("Lightbulb", "lightbulb");
export const LineChart = createLiteIcon("LineChart", "chart");
export const Loader2 = createLiteIcon("Loader2", "refresh");
export const Mail = createLiteIcon("Mail", "mail");
export const MailX = createLiteIcon("MailX", "mail");
export const MapPin = createLiteIcon("MapPin", "map-pin");
export const Megaphone = createLiteIcon("Megaphone", "message");
export const Menu = createLiteIcon("Menu", "menu");
export const MessageCircle = createLiteIcon("MessageCircle", "message");
export const MoreHorizontal = createLiteIcon("MoreHorizontal", "circle");
export const Newspaper = createLiteIcon("Newspaper", "file");
export const PanelLeft = createLiteIcon("PanelLeft", "panel");
export const PenLine = createLiteIcon("PenLine", "file");
export const Quote = createLiteIcon("Quote", "message");
export const Radio = createLiteIcon("Radio", "rss");
export const Receipt = createLiteIcon("Receipt", "file");
export const RefreshCw = createLiteIcon("RefreshCw", "refresh");
export const Rss = createLiteIcon("Rss", "rss");
export const Search = createLiteIcon("Search", "search");
export const Send = createLiteIcon("Send", "send");
export const Share2 = createLiteIcon("Share2", "workflow");
export const Shield = createLiteIcon("Shield", "shield");
export const ShieldCheck = createLiteIcon("ShieldCheck", "shield");
export const Sparkles = createLiteIcon("Sparkles", "sparkles");
export const Target = createLiteIcon("Target", "target");
export const TrendingUp = createLiteIcon("TrendingUp", "chart");
export const User = createLiteIcon("User", "user");
export const Users = createLiteIcon("Users", "user");
export const Wand2 = createLiteIcon("Wand2", "wand");
export const Workflow = createLiteIcon("Workflow", "workflow");
export const X = createLiteIcon("X", "x");
export const Zap = createLiteIcon("Zap", "zap");
