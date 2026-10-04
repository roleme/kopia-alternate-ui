import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { AppShell, createTheme, MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppContextProvider } from "./core/context/AppContext";
import { ServerInstanceContextProvider } from "./core/context/ServerInstanceContext";
import { MobileHeader } from "./core/Sidebar/MobileHeader";
import { SHELL_PROPS } from "./core/Sidebar/shellLayout";
import { Sidebar } from "./core/Sidebar/Sidebar";
import { dynamicActivate } from "./i18n";

function BaseLayout() {
  const theme = createTheme({
    fontFamily: '"Nunito", sans-serif;'
  });

  useEffect(() => {
    dynamicActivate();
  }, []);

  return (
    <I18nProvider i18n={i18n}>
      <MantineProvider defaultColorScheme="dark" theme={theme}>
        <ModalsProvider>
          <ServerInstanceContextProvider>
            <AppContextProvider>
              <Notifications position="top-right" />
              <AppShell {...SHELL_PROPS}>
                <MobileHeader />
                <Sidebar />
                <AppShell.Main>
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
