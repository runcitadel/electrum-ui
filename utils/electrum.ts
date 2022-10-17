import jsonSeqReader from "./jsonSeqReader.ts";

/** An Electrum client that does not yet support parallel requests */
export default class ElectrumClient {
    #connection: Deno.TcpConn | Deno.TlsConn | null = null;
    #connectionPromise: Promise<Deno.TcpConn | Deno.TlsConn> | null;
    #requests = 0;
    #reader: AsyncGenerator | null = null;
    constructor(
        private hostname: string,
        private port: number,
        private transport: "tcp" | "tls" = "tcp",
        private tlsOptions: {
            /**
             * PEM formatted client certificate chain.
             */
            certChain?: string;
            /**
             * PEM formatted (RSA or PKCS8) private key of client certificate.
             */
            privateKey?: string;
            /**
             * Application-Layer Protocol Negotiation (ALPN) protocols supported by
             * the client. If not specified, no ALPN extension will be included in the
             * TLS handshake.
             */
            alpnProtocols?: string[];
        } = {},
    ) {
        if (transport == "tcp") {
            this.#connectionPromise = Deno.connect({
                hostname,
                port,
                transport: transport,
            });
        } else if (transport == "tls") {
            this.#connectionPromise = Deno.connectTls({
                hostname,
                port,
                ...tlsOptions,
            });
        } else {
            throw new TypeError("Unknown transport");
        }
    }

    async connect() {
        if (this.#connectionPromise) {
            this.#connection = await this.#connectionPromise;
        } else {
            if (this.transport == "tcp") {
                this.#connection = await Deno.connect({
                    hostname: this.hostname,
                    port: this.port,
                    transport: this.transport,
                });
            } else if (this.transport == "tls") {
                this.#connection = await Deno.connectTls({
                    hostname: this.hostname,
                    port: this.port,
                    ...this.tlsOptions,
                });
            }
        }
        this.#reader = jsonSeqReader(this.#connection?.readable!);
        this.sendRequest("server.version", ["Deno Electrum Client", "1.4"])
    }

    async disconnect() {
        this.#reader = null;
        await this.#connection!.close();
    }

    async sendRequest<ReturnType extends unknown = unknown>(method: string, params: unknown): Promise<ReturnType> {
        this.#requests++;
        if (!this.#connection) {
            throw new Error("Not connected! Did you forget to call connect()?");
        }
        const id = this.#requests;
        await this.#connection!.write(
            new TextEncoder().encode(
                JSON.stringify({
                    jsonrpc: "2.0",
                    id,
                    method,
                    params,
                }) + "\r\n",
            ),
        );
        const data = (await this.#reader?.next())!.value;
        if (data.id !== id) {
            throw new Error("Response id does not match request ID!");
        }
        return data.result;
    }
}
