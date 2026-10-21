// A post's link-preview image, at /blog/<slug>/og.png: the post's own
// social.png when its folder has one, such as a screenshot of what it is
// about, and otherwise the card drawn from its title and dek.
import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { allPosts, type Post } from "../../../components/blog/posts";
import { card } from "../../../components/blog/card";

export async function getStaticPaths() {
  return (await allPosts()).map((post) => ({ params: { slug: post.id }, props: { post } }));
}

export const GET: APIRoute = async ({ props }) => {
  const post = (props as { post: Post }).post;
  const own = path.join(process.cwd(), "src", "content", "blog", post.id, "social.png");
  const image = fs.existsSync(own) ? fs.readFileSync(own) : await card(post);
  return new Response(new Uint8Array(image), { headers: { "Content-Type": "image/png" } });
};
