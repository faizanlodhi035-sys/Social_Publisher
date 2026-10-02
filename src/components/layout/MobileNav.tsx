import {
  BarChart3,
  CalendarDays,
  FileVideo,
  Home,
  Plus,
} from "lucide-react";

const navigation = [
  {
    label: "Home",
    icon: Home,
    path: "/",
  },
  {
    label: "Content",
    icon: FileVideo,
    path: "/content",
  },
  {
    label: "Create",
    icon: Plus,
    path: "/create",
    primary: true,
  },
  {
    label: "Calendar",
    icon: CalendarDays,
    path: "/calendar",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    path: "/analytics",
  },
];

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-2 pb-safe lg:hidden">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {navigation.map((item) => {
          const Icon = item.icon;

          if (item.primary) {
            return (
              <a
                key={item.path}
                href={item.path}
                className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg ring-4 ring-white"
                aria-label={item.label}
              >
                <Icon size={22} strokeWidth={2.5} />
              </a>
            );
          }

          return (
            <a
              key={item.path}
              href={item.path}
              className="flex min-w-[52px] flex-col items-center justify-center gap-1 text-slate-500"
            >
              <Icon size={19} strokeWidth={1.9} />

              <span className="text-[10px] font-medium">
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}