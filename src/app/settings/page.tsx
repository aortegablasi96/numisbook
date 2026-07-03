import { revalidatePath } from "next/cache";
import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { setBaseCurrency } from "@/services/user.service";
import { COMMON_CURRENCIES } from "@/lib/currencies";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { DeleteAccountSection } from "@/components/settings/DeleteAccountSection";

export const metadata = { title: "Settings · NumisBook" };

// Base-currency preference: a Server Component form reusing the existing
// setBaseCurrency service (its canonical home; the /portfolio control remains a
// convenience). Rendered between Profile and the Danger zone.
function BaseCurrencySelect({ selected }: { selected: string | null }) {
  async function update(formData: FormData) {
    "use server";
    const session = await auth();
    const user = await resolveCurrentUser(session);
    if (!user) return;
    await setBaseCurrency(user.id, String(formData.get("baseCurrency") ?? ""));
    revalidatePath("/settings");
  }
  return (
    <section className="card stack">
      <h2 style={{ margin: 0 }}>Preferences</h2>
      <form action={update} className="field">
        <label htmlFor="baseCurrency" className="mono-label">
          Base currency
        </label>
        <div className="row">
          <select id="baseCurrency" name="baseCurrency" defaultValue={selected ?? ""}>
            <option value="">Auto (largest holding)</option>
            {COMMON_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-sm">
            Apply
          </button>
        </div>
      </form>
      <p className="muted" style={{ margin: 0 }}>
        Applied to your portfolio analytics. &ldquo;Auto&rdquo; uses the currency
        of your largest holding.
      </p>
    </section>
  );
}

export default async function SettingsPage() {
  const session = await auth();
  const user = await resolveCurrentUser(session);

  if (!user) {
    return (
      <main className="stack">
        <h1>Settings</h1>
        <div className="card stack">
          <p>Sign in to manage your account and preferences.</p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/settings" });
            }}
          >
            <button type="submit" className="btn-primary">
              Sign in with Google
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="stack settings-page">
      <h1 style={{ margin: 0 }}>Settings</h1>
      <ProfileForm initialName={user.name ?? ""} email={user.email} />
      <BaseCurrencySelect selected={user.baseCurrency} />
      <DeleteAccountSection />
    </main>
  );
}
