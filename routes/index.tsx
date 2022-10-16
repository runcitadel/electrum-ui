import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";

import ElectrumClient from "../utils/electrum.ts";
import BitcoinRPC from "https://deno.land/x/bitcoin_rpc@v1.0.2/mod.ts";
import { getInfoResponse } from "../utils/bitcoin.ts";

interface ElectrumInfo {
  bitoinSyncPercent: number;
  bitcoinHeight: number;
  electrumHeight: number;
  electrumPercent: number;
}

const bitcoindClient = new BitcoinRPC({
  host: Deno.env.get("BITCOIN_IP")!,
  port: parseInt(Deno.env.get("BITCOIN_RPC_PORT")!),
  username: Deno.env.get("BITCOIN_RPC_USER")!,
  password: Deno.env.get("BITCOIN_RPC_PASS")!,
});
const electrumClient = new ElectrumClient(Deno.env.get("ELECTRUM_IP")!, parseInt(Deno.env.get("ELECTRUM_PORT")!));

export const handler: Handlers<ElectrumInfo | null> = {
  async GET(_, ctx) {
    let bitoinSyncPercent = 0;
    let bitcoinHeight = 0;
    let electrumHeight = 0;
    try {
      const data = await bitcoindClient.getblockchaininfo() as getInfoResponse;
      bitcoinHeight = data.blocks;
      bitoinSyncPercent = Math.round(data.verificationprogress * 100);
    } catch (e) {
      console.error(e);
    }
    try {
      await electrumClient.connect();
      const data = await electrumClient.sendRequest<{
        height: number;
      }>("blockchain.headers.subscribe", [], 230);
      electrumHeight = data.height;
    } catch (e) {
      console.error(e);
    }
  
    const ElectrumInfo: ElectrumInfo = {
      bitoinSyncPercent,
      bitcoinHeight,
      electrumHeight,
      electrumPercent: bitcoinHeight == 0 ? 0 : Math.round((electrumHeight / bitcoinHeight) * 10000) / 100,
    };
    return ctx.render(ElectrumInfo);
  },
};

export default function Home({ data }: PageProps<ElectrumInfo | null>) {
  return (
    <>
      <Head>
        <title>Electrum Server</title>
      </Head>
      <div class="p-4 mx-auto max-w-screen-md">
        <img
          src="/logo.svg"
          class="w-32 h-32"
          alt="the fresh logo: a sliced lemon dripping with juice"
        />
        <p class="my-6">
          Electrum Server is synced to block {data?.electrumHeight} ({data?.electrumPercent}%).
        </p>
      </div>
    </>
  );
}
