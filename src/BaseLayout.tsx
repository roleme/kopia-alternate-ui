import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { AppShell, MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppContextProvider } from "./core/context/AppContext";
import { ServerInstanceContextProvider } from "./core/context/ServerInstanceContext";
import { MobileHeader } from "./core/Sidebar/MobileHeader";
import { Sidebar } from "./core/Sidebar/Sidebar";
import { SHELL_PROPS } from "./core/Sidebar/shellLayout";
import { MAIN_CONTENT_ID, SkipLink } from "./core/SkipLink/SkipLink";
import { dynamicActivate } from "./i18n";
import { cssVariablesResolver, theme } from "./theme";

function BaseLayout() {
  useEffect(() => {
    dynamicActivate();
  }, []);

  return (
    <I18nProvider i18n={i18n}>
      <MantineProvider defaultColorScheme="dark" theme={theme} cssVariablesResolver={cssVariablesResolver}>
        <ModalsProvider>
          <ServerInstanceContextProvider>
            <AppContextProvider>
              <SkipLink />
              <Notifications position="top-right" />
              <AppShell {...SHELL_PROPS}>
                <MobileHeader />
                <Sidebar />
                <AppShell.Main id={MAIN_CONTENT_ID} tabIndex={-1}>
                  <Outlet />
                </AppShell.Main>
              </AppShell>
            </AppContextProvider>
          </ServerInstanceContextProvider>
        </ModalsProvider>
      </MantineProvider>
    </I18nProvider>
  );
}

export default BaseLayout;
