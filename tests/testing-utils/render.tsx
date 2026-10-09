// ./test-utils/render.tsx

import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { MantineProvider } from "@mantine/core";
import { render as testingLibraryRender } from "@testing-library/react";
import { MemoryRouter } from "react-router";

i18n.load("en", {});
i18n.activate("en");

export function render(ui: React.ReactNode) {
  return testingLibraryRender(<>{ui}</>, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <I18nProvider i18n={i18n}>
        <MantineProvider env="test">
          <MemoryRouter>{children}</MemoryRouter>
        </MantineProvider>
      </I18nProvider>
    )
  });
}
