import { FIREBASE_DB } from "@/firebaseConfig";
import { Blog, BlogCover } from "@/zustand/blog";
import { Post } from "@/zustand/post";
import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";

async function fetchPostRecord(
  authorUid: string,
  blogId: string
): Promise<Blog | null> {
  try {
    const blogDocRef = doc(FIREBASE_DB, `users/${authorUid}/blogs/${blogId}`);
    const blogDoc = await getDoc(blogDocRef);

    if (blogDoc.exists()) {
      const blogData = blogDoc.data();

      return {
        id: blogDoc.id,
        author_uid: authorUid,
        ...blogData,
      } as Blog;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching blog from Firestore:", error);
    return null;
  }
}

async function createPostRecord(draft: Post, authorUid: string) {
  const current_time = new Date();
  let draftBlog = {
    post: draft,
    likes_count: 0,
    is_public: true,
    created_at: current_time,
    updated_at: current_time,
    author_uid: authorUid,
    author: {
      cid: "",
      name: "Anonymous",
      avatar: "",
    },
  } as Blog;

  try {
    const blogsCollectionRef = collection(
      FIREBASE_DB,
      `users/${authorUid}/blogs`
    );
    const blog = await addDoc(blogsCollectionRef, draftBlog);
    if (blog && draftBlog.is_public) {
      draftBlog.id = blog.id;
      createBlogCoverRecord(draftBlog);
    }
  } catch (error) {
    console.error("An error occurred while creating the post", error);
  }
}

async function destroyPostRecord(userUid: string, blogId: string) {
  try {
    const postRef = doc(FIREBASE_DB, `users/${userUid}/blogs/${blogId}`);
    await deleteDoc(postRef);
    destroyBlogCoverRecord(blogId);
  } catch (error) {
    console.error("An error occurred while destroying the post", error);
  }
}

async function createBlogCoverRecord(blog: Blog) {
  let blogCoverData = {
    post_title: blog.post.title,
    post_image_cover: blog.post.image_cover,
    post_likes_count: blog.likes_count,
    author_uid: blog.author_uid,
    author: blog.author,
  } as BlogCover;

  try {
    const blogCoverDocRef = doc(FIREBASE_DB, "blog_covers", blog.id);
    await setDoc(blogCoverDocRef, blogCoverData);
  } catch (error) {
    console.error("An error occurred while creating the post cover", error);
  }
}

async function destroyBlogCoverRecord(blogId: string) {
  try {
    const blogCoverRef = doc(FIREBASE_DB, "blog_covers", blogId);
    await deleteDoc(blogCoverRef);
  } catch (error) {
    console.error("An error occurred while destroying the post cover", error);
  }
}

export {
  fetchPostRecord,
  createPostRecord,
  destroyPostRecord,
  createBlogCoverRecord,
  destroyBlogCoverRecord,
};
