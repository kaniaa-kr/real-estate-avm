import { ServerStatusProvider } from "@/components/server-status-provider";
import { SimsApp } from "@/components/sims/SimsApp";

export default function Home() {
  return (
    <ServerStatusProvider>
      <SimsApp />
    </ServerStatusProvider>
  );
}
