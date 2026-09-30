import { Brand } from "../Brand/Brand";
import { LanguageSwitch } from "../LanguageSwitch/LanguageSwitch";

export const TopBar = () => (
  <header className="flex h-16 items-center gap-4 px-4 md:px-10">
    <div className="md:hidden">
      <Brand />
    </div>
    <div className="ml-auto">
      <LanguageSwitch />
    </div>
  </header>
);
