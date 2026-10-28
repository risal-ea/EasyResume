import { profilePath } from "@/paths";
import { exampleProfileForForm } from "@/core/exampleProfile";
import { mergeImported } from "@/core/import/merge";
import { getPendingImport, getUpload } from "@/core/store/importStore";
import { loadProfile, profileExists } from "@/core/store/profileStore";
import { ImportPanel } from "./ImportPanel";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  try {
    // New users start from an example profile they can edit or clear.
    const isNew = !profileExists();
    const initial = isNew ? exampleProfileForForm() : loadProfile();

    // Data the AI assistant imported from an uploaded resume, added to what is already saved.
    const upload = getUpload();
    const pending = getPendingImport();
    const imported = pending ? { fileName: pending.fileName, profile: mergeImported(loadProfile(), pending.profile) } : null;

    return (
      <ProfileForm
        // A new import remounts the form so it starts from the imported data.
        key={pending?.importedAt ?? "saved"}
        initial={initial}
        dataFile={profilePath()}
        isNew={isNew}
        imported={imported}
        importPanel={<ImportPanel upload={upload} pending={pending && { fileName: pending.fileName, importedAt: pending.importedAt }} />}
      />
    );
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
