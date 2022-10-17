/**
 * @module jsonSeqReader
 * @author Francis Whittle <code@powered.ninja>
 *
 * Copyright (C) 2018 Francis Whittle
 * Copyright (C) 2022 Aaron Dewes
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @usage
 *  import jsonSeqReader from 'json-seq-reader.js';
 *  ...
 *  fetch([uri producing application/json-seq])
 *    .then(r => r.body)
 *    .then(rs => {
 *      let gen = jsonSeqReader(rs, (p) => console.log(p));
 *      for await (value of gen) {
 *        // value is a javascript object parsed from the fetched stream
 *      }
 *    });
 */

/**
 * Generate Objects from a ReadableStream of RFC 7464 JSON Text Sequences
 *
 * @generator
 * @async
 * @function jsonSeqReader
 * @param {ReadableStream} rs - The RFC 7464 data source
 * @param {function} progressCallBack - Called with the count of parsed objects
 * @param {Uint8} RS - Optional, record separator.  Defaults to ANSI RS code per standard.
 * @yields {Object} - Object parsed from the next chunk of JSON
 */
async function* jsonSeqReader(rs: ReadableStream, progressCallback?: (count: number) => unknown, RS = 0x1e) {
    const reader = rs.getReader();
    const utf8Decoder = new TextDecoder();

    // Initialise counter and blank data array
    let total = 0;
    let all = new Uint8Array([]);

    let done, value;

    // Read the next chunk of available data, unless we're already done.
    while (!done && ({ done, value } = await reader.read())) {
        if (value) {
            // Join the remainder read data with this chunk
            const newarr = new Uint8Array(all.length + value.length);
            newarr.set(all);
            newarr.set(value, all.length);
            all = newarr;

            let idx;

            // Split all read data by record separator character.
            // If the Reader is done, also process the last piece of data
            while (idx = all.indexOf(RS), idx > -1 || done) {
                total++;

                // Weed out consecutive record separators early
                if (idx == 0) {
                    all = all.subarray(1);
                    continue;
                }

                // Extract the next chunk
                const nextSlice = idx > 0 ? all.subarray(0, idx - 1) : all;
                const nextChunk = utf8Decoder.decode(nextSlice);
                all = all.subarray(idx + 1);

                // Parse and yield non-whitespace chunks
                if (/\S/.test(nextChunk)) {
                    if(progressCallback)
                        progressCallback(total);
                    yield JSON.parse(nextChunk);
                }
            }
        }
    }
}

export default jsonSeqReader;