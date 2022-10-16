
/** An Electrum client that does not yet support parallel requests */
export default class ElectrumClient {
    #connection: Deno.TcpConn | Deno.TlsConn | null = null;
    #connectionPromise: Promise<Deno.TcpConn | Deno.TlsConn> | null;
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
        this.sendRequest("server.version", ["Deno Electrum Client", "1.4"])
    }

    async disconnect() {
        await this.#connection!.close();
    }

    async sendRequest<ReturnType extends unknown = unknown>(method: string, params: unknown, maxResponseLength = 100): Promise<Awaited<ReturnType>> {
        if (!this.#connection) {
            throw new Error("Not connected! Did you forget to call connect()?");
        }
        await this.#connection!.write(
            new TextEncoder().encode(
                JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method,
                    params,
                }) + "\r\n",
            ),
        );
        const buffer = new Uint8Array(maxResponseLength);
        const read = await this.#connection!.read(buffer);
        const content = buffer.slice(0, read!);
        return JSON.parse(new TextDecoder().decode(content)).result;
    }
}