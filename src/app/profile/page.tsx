import { profilePath } from "@/paths";
import { exampleProfileForForm } from "@/core/exampleProfile";
import { loadProfile, profileExists } from "@/core/store/profileStore";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  try {
    // New users start from an example profile they can edit or clear.
    const isNew = !profileExists();
    const initial = isNew ? exampleProfileForForm() : loadProfile();
    return <ProfileForm initial={initial} dataFile={profilePath()} isNew={isNew} />;
  } catch (err) {
    return (
      <div className="card">
        <h1>Your profile could not be loaded</h1>
        <p className="status-error">{(err as Error).message}</p>
        <p className="muted">Fix or remove the file and reload this page.</p>
      </div>
    );
  }
}
