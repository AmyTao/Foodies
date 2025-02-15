import { create } from "zustand";
import { Post } from "./post";
import { UserPublicProfile } from "./user";

export type BlogCover = {
  blog_id: string;
  post_title: string;
  post_image_cover: string;
  post_likes_count: number;
  author_uid: string;
  author: UserPublicProfile;
  rtt_yelp_id: string;
};

export type Blog = {
  id: string;
  post: Post;
  likes_count: number;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
  author_uid: string;
  author: UserPublicProfile;
};

type BlogStore = {
  blogs: Blog[];
  setBlogs: (blogs: Blog[]) => void;
  addBlog: (blog: Blog) => void;
  removeBlog: (id: string) => void;
  blogCovers: BlogCover[];
  setBlogCovers: (blogCovers: BlogCover[]) => void;
};

export const useBlogStore = create<BlogStore>()((set) => ({
  blogs: [],
  setBlogs: (blogs) => set(() => ({ blogs })),
  addBlog: (blog) => set((state) => ({ blogs: [...state.blogs, blog] })),
  removeBlog: (id) =>
    set((state) => ({ blogs: state.blogs.filter((blog) => blog.id !== id) })),
  // blogCovers
  blogCovers: [],
  setBlogCovers: (blogCovers) => set(() => ({ blogCovers })),
}));
