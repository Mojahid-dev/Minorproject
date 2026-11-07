import {
  CalendarDays,
  FolderOpen,
  Home,
  ListTodo,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type TourChapterId = "home" | "library" | "plan" | "calendar" | "ai" | "you";

export const TOUR_CHAPTERS: { id: TourChapterId; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "library", label: "Library", icon: FolderOpen },
  { id: "plan", label: "Tasks", icon: ListTodo },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "ai", label: "Zohra AI", icon: Sparkles },
  { id: "you", label: "You", icon: UserRound },
];

export type TourAction =
  /** The person taps the highlighted element. */
  | { type: "click"; hint: string }
  /** The person does something that fires a window event. */
  | { type: "event"; name: string; hint: string };

export type TourStep = {
  id: string;
  chapter: TourChapterId;
  /** Page the step lives on (prefix match). The tour navigates there if needed. */
  route: string;
  title: string;
  body: string;
  /** CSS selectors, tried in order; the first one that is visible wins. */
  targets?: string[];
  /** Highlight the closest ancestor matching this selector instead. */
  closest?: string;
  action?: TourAction;
  /** On phones this target lives in the "More" menu, so open it first. */
  openMore?: boolean;
  /** "welcome" and "finish" are centred cards instead of tooltips. */
  kind?: "welcome" | "finish";
};

const nav = (name: string) => `[data-tour="nav-${name}"]`;

export const TOUR_STEPS: TourStep[] = [
  { id: "welcome", kind: "welcome", chapter: "home", route: "/dashboard", title: "Welcome to Zohra", body: "A quick hands-on tour of the real app. About 2 minutes." },

  // Home
  { id: "today", chapter: "home", route: "/dashboard", title: "Your day, at a glance", body: "Today’s tasks and anything overdue live here. Tick one off to move your progress.", targets: ['[data-tour="dash-today"]'] },
  { id: "dash-ai", chapter: "home", route: "/dashboard", title: "Zohra AI is one tap away", body: "Pick up your last chat or start a new one from here.", targets: ['[data-tour="dash-ai"]'] },

  // Library
  { id: "go-upload", chapter: "library", route: "/dashboard", title: "Start with your notes", body: "Add PDFs, slides or notes so Zohra can work with them.", targets: [nav("upload")], action: { type: "click", hint: "Tap Upload" } },
  { id: "upload-drop", chapter: "library", route: "/upload", title: "Drop files here", body: "Zohra reads them, so you can search them and ask the AI about them.", targets: ['[data-tour="upload-drop"]'] },
  { id: "upload-details", chapter: "library", route: "/upload", title: "Say where it belongs", body: "Course, subject and tags keep everything easy to find. You can add them after uploading too.", targets: ['[data-tour="upload-details"]'] },
  { id: "go-resources", chapter: "library", route: "/upload", title: "See your library", body: "Everything you upload ends up in Resources.", targets: [nav("resources")], openMore: true, action: { type: "click", hint: "Tap Resources" } },
  { id: "resources-toolbar", chapter: "library", route: "/resources", title: "Find it fast", body: "Search, filter by type, sort, and flip between grid and list.", targets: ['[data-tour="resources-toolbar"]', "#resources-panel"] },

  // Tasks
  { id: "go-tasks", chapter: "plan", route: "/resources", title: "Now, plan your work", body: "Tasks is where to-dos live.", targets: [nav("tasks")], action: { type: "click", hint: "Tap Tasks" } },
  { id: "add-task", chapter: "plan", route: "/tasks", title: "Add your first task", body: "Type something you need to do and press Enter. It’s a real task — you can delete it later.", targets: ["#new-task-title"], closest: "form", action: { type: "event", name: "zohra:tasks-updated", hint: "Add a task to continue" } },
  { id: "task-list", chapter: "plan", route: "/tasks", title: "Check things off", body: "Tick tasks as you finish them. Overdue ones always show first.", targets: ['section[aria-label="Task list"]'] },

  // Calendar
  { id: "go-calendar", chapter: "calendar", route: "/tasks", title: "See the month", body: "The calendar shows what’s due, day by day.", targets: [nav("calendar")], action: { type: "click", hint: "Tap Calendar" } },
  { id: "calendar-grid", chapter: "calendar", route: "/calendar", title: "Your month at a glance", body: "Days with tasks are marked. Tap any day to open its agenda.", targets: ['section[aria-label="Monthly task calendar"]'] },
  { id: "calendar-add", chapter: "calendar", route: "/calendar", title: "Add to the selected day", body: "Quick-add a task straight from the agenda.", targets: ["#calendar-quick-add"], closest: "form" },

  // AI
  { id: "go-ai", chapter: "ai", route: "/calendar", title: "Meet Zohra AI", body: "It opens full-screen so you can focus.", targets: [nav("ai")], openMore: true, action: { type: "click", hint: "Tap Zohra AI" } },
  { id: "ai-input", chapter: "ai", route: "/zohra-ai", title: "Ask, or tell it what to plan", body: "Try “Plan my week for exams”. It can turn that into real tasks, and answer from your files.", targets: ['textarea[aria-label="Message Zohra AI"]'], closest: "form" },
  { id: "ai-back", chapter: "ai", route: "/zohra-ai", title: "Back to your workspace", body: "Use this any time to return to the dashboard.", targets: ['a[aria-label="Back to dashboard"]', 'aside a[href="/dashboard"]'] },

  // You
  { id: "settings-push", chapter: "you", route: "/settings", title: "Get reminders", body: "Turn on notifications to hear about due tasks and finished files.", targets: ["#notification-settings"] },
  { id: "theme", chapter: "you", route: "/settings", title: "Light or dark", body: "Switch whenever you like. Zohra remembers.", targets: ['[data-tour="theme-toggle"]'], action: { type: "click", hint: "Tap the theme button" } },
  { id: "go-profile", chapter: "you", route: "/settings", title: "Your profile", body: "Your photo, details and recognition badge live here.", targets: ['[data-tour="profile-link"]'], action: { type: "click", hint: "Tap your avatar" } },
  { id: "profile-hero", chapter: "you", route: "/profile", title: "This is you", body: "Edit your details any time from here.", targets: ["section.keep-dark"] },

  { id: "finish", kind: "finish", chapter: "you", route: "/profile", title: "You’re all set", body: "Pick a first move, or explore on your own." },
];
