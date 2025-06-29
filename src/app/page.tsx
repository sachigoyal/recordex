import { Icons } from "@/components/icons";
import ModeToggle from "@/components/ModeToggle";
import ScreenRecorderApp from "@/components/ScreenRecoder";

export default function Home() {
  return (
    <div>
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <a
          href="https://github.com/sachigoyal/recordex"
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors"
        >
          <Icons.Github className="w-5 h-5" />
        </a>
        <ModeToggle className="border-none bg-transparent hover:bg-gray-100 cursor-pointer rounded-full" />
      </div>
      <ScreenRecorderApp />
    </div>
  );
}
