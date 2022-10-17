import { HandlerContext } from "$fresh/server.ts";
import ElectrumClient from "$utils/electrum.ts";
import BitcoinRPC from "https://deno.land/x/bitcoin_rpc@v1.0.2/mod.ts";
import { getInfoResponse } from "../../utils/bitcoin.ts";

const bitcoindClient = new BitcoinRPC({
  host: Deno.env.get("BITCOIN_IP")!,
  port: parseInt(Deno.env.get("BITCOIN_RPC_PORT")!),
  username: Deno.env.get("BITCOIN_RPC_USER")!,
  password: Deno.env.get("BITCOIN_RPC_PASS")!,
});
const electrumClient = new ElectrumClient(Deno.env.get("ELECTRUM_IP")!, parseInt(Deno.env.get("ELECTRUM_PORT")!) || 50001);

export const handler = async (_req: Request, _ctx: HandlerContext): Promise<Response> => {
  let bitoinSyncPercent = 0;
  let bitcoinHeight = 0;
  let electrumHeight = 0;
  try {
    const data = await bitcoindClient.getblockchaininfo() as getInfoResponse;
    bitcoinHeight = data.blocks;
    bitoinSyncPercent = Math.round(data.verificationprogress * 10000) / 100;
  } catch (e) {
    console.error(e);
  }
  try {
    await electrumClient.connect();
    const data = await electrumClient.sendRequest<{
      height: number;
    }>("blockchain.headers.subscribe", []);
    electrumHeight = data.height;
  } catch (e) {
    console.error(e);
  }
  return new Response(JSON.stringify({
    bitoinSyncPercent,
    bitcoinHeight,
    electrumHeight,
    electrumPercent: bitcoinHeight == 0 ? -1 : (Math.round((electrumHeight / bitcoinHeight) * 10000) / 100),
  }), {
    headers: new Headers({
      "Content-Type": "application/json"
    })
  });
};
