import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import LanguageSwitcher from "@workspace/ui/blocks/settings/langauge-switcher"
import { describe, expect, it, vi } from "vitest"

vi.mock("@workspace/ui/components/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),

  DropdownMenuTrigger: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),

  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),

  DropdownMenuCheckboxItem: ({
    children,
    checked,
    onCheckedChange,
  }: {
    children: React.ReactNode
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
  }) => (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
    >
      {children}
    </button>
  ),
}))

describe("LanguageSwitcher", () => {
  it("renders the current locale", () => {
    render(<LanguageSwitcher locale="en" updateLocale={vi.fn()} />)

    expect(
      screen.getByRole("button", {
        name: /language switcher/i,
      })
    ).toHaveTextContent("EN")
  })

  it("renders all supported locales", () => {
    render(<LanguageSwitcher locale="en" updateLocale={vi.fn()} />)

    expect(screen.getByRole("checkbox", { name: "EN" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "AR" })).not.toBeChecked()
  })
  it("renders en locale by default", () => {
    render(<LanguageSwitcher locale="" updateLocale={vi.fn()} />)

    expect(screen.getByRole("checkbox", { name: "EN" })).toBeChecked()
  })
  it("renders en locale when locale is en", () => {
    render(<LanguageSwitcher locale="en" updateLocale={vi.fn()} />)
    expect(screen.getByRole("button")).toHaveTextContent("EN")
  })
  it("renders ar locale when locale is ar", () => {
    render(<LanguageSwitcher locale="ar" updateLocale={vi.fn()} />)
    expect(screen.getByRole("button")).toHaveTextContent("AR")
  })

  it("calls updateLocale when a locale is selected", async () => {
    const user = userEvent.setup()
    const updateLocale = vi.fn()

    render(<LanguageSwitcher locale="en" updateLocale={updateLocale} />)

    await user.click(screen.getByRole("checkbox", { name: "AR" }))

    expect(updateLocale).toHaveBeenCalledOnce()
    expect(updateLocale).toHaveBeenCalledWith("ar")
  })
})
