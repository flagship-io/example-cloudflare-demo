import { DecisionMode, Flagship, HitType } from "@flagship.io/js-sdk/dist/index.browser.lite";
import cookie from "cookie";

// import bucketing file
import bucketingData from "./bucketing.json";


const html = (
    flagValue,
    visitorId,
    region
) => `<!DOCTYPE html>
  <body>
    <h1>Hello World from ${region}</h1>
    <p>This is my Cloudflare Worker using Flagship for the visitorID : <span style="color: red;">${visitorId}</span> assigned on flag <span style="color: red;">${flagValue}</span>.</p>
  </body>`;

const FS_VISITOR_ID_COOKIE_NAME = "fs_visitor_id";

export default {
    async fetch(request, env, ctx) {

        // Start the SDK
        Flagship.start(env.ENV_ID, env.API_KEY, {
            decisionMode: DecisionMode.BUCKETING_EDGE, // Set decisionMode to BUCKETING_EDGE
            initialBucketing: bucketingData, // Set bucketing data fetched from flagship CDN
        });

        const cookies = cookie.parse(request.headers.get("Cookie") || "");

        //Get visitor Id from cookies
        const visitorId = cookies[FS_VISITOR_ID_COOKIE_NAME];

        const visitor = Flagship.newVisitor({
            visitorId, // if no visitor id exists from the cookie, the SDK will generate one
        });

        await visitor.fetchFlags();

        const flag = visitor.getFlag("my_flag_key", "default-value");

        const flagValue = flag.getValue();

        await visitor.sendHit({
            type: HitType.PAGE,
            documentLocation: "page",
        });

        // close the SDK to batch and send all hits
        ctx.waitUntil(Flagship.close());

        return new Response(
            html(flagValue, visitor.visitorId, request?.cf?.region),
            {
                headers: {
                    "content-type": "text/html;charset=UTF-8",
                    "Set-Cookie": cookie.serialize(
                        FS_VISITOR_ID_COOKIE_NAME,
                        visitor.visitorId
                    ),
                },
            }
        );
    },
};
