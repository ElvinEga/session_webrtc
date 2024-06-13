/**
 * v0 by Vercel.
 * @see https://v0.dev/t/O66n9IAwGJr
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PhoneOff } from "lucide-react";

export default function Component() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className=" max-w-6xl mx-4 sm:mx-6 md:mx-8 lg:mx-10 xl:mx-12 bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden">
          <div className="flex h-[500px]">
            <div className="flex-1 flex flex-col">
              <div className="flex-1 relative">
                <video
                  className="w-full h-full object-cover"
                  src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                  autoPlay
                  loop
                  muted
                />
                <div className="absolute top-4 left-4 bg-gray-900/50 text-white px-3 py-1 rounded-full text-sm">
                  Session A
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-800 p-4 flex items-center justify-center gap-4">
                <Button variant="ghost" size="icon">
                  <PhoneIcon className="w-5 h-5" />
                  <span className="sr-only">Call</span>
                </Button>
                <Input type="text" placeholder="Session A" />
              </div>
            </div>
            <div className="flex-1 flex flex-col">
              <div className="flex-1 relative">
                <video
                  className="w-full h-full object-cover"
                  src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
                  autoPlay
                  loop
                  muted
                />
                <div className="absolute top-4 left-4 bg-gray-900/50 text-white px-3 py-1 rounded-full text-sm">
                  Session B
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-800 p-4 flex items-center justify-center gap-4">
                <Button variant="ghost" size="icon">
                  <PhoneIcon className="w-5 h-5" />
                  <span className="sr-only">Call</span>
                </Button>
                <Input type="text" placeholder="Session B" />
              </div>
            </div>
          </div>
          <div className="col-span-2 bg-gray-100 dark:bg-gray-800 p-4 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <PhoneIcon className="h-6 w-6" />
              <span className="sr-only">Call</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <VideoIcon className="h-6 w-6" />
              <span className="sr-only">Enable Video</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <MicOffIcon className="h-6 w-6" />
              <span className="sr-only">Disable Mic</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-rose-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <PhoneOff className="h-6 w-6" />
              <span className="sr-only">Disable Mic</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MicOffIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
      <path d="M5 10v2a7 7 0 0 0 12 5" />
      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function PhoneIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function VideoIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  );
}
