import { AccountForm } from "@/components/admin/account-form";
import { PageHeader } from "@/components/admin/page-header";
import { requireStaffPage } from "@/lib/auth";

export const metadata = { title: "Mi cuenta" };

export default async function AccountPage() {
  const { user, profile } = await requireStaffPage();
  return (
    <>
      <PageHeader title="Mi cuenta" description={user.email} />
      <AccountForm fullName={profile?.full_name ?? ""} />
    </>
  );
}
