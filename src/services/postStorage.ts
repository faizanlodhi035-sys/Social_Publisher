import type { PublisherPost } from "../types/post";

const STORAGE_KEY = "social_publisher_all_posts";

const defaultMockPosts: PublisherPost[] = [];

export const postStorage = {
  getAllPosts: (): PublisherPost[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as PublisherPost[];
      }
      
      // Seed with mock data if empty
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultMockPosts));
      return defaultMockPosts;
    } catch (error) {
      console.error("Error reading from localStorage", error);
      return [];
    }
  },

  savePosts: (newPosts: PublisherPost[]) => {
    try {
      const currentPosts = postStorage.getAllPosts();
      const updated = [...newPosts, ...currentPosts];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Error saving to localStorage", error);
    }
  },

  updatePost: (updatedPost: PublisherPost) => {
    try {
      const currentPosts = postStorage.getAllPosts();
      const nextPosts = currentPosts.map((post) =>
        post.id === updatedPost.id ? updatedPost : post
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPosts));
    } catch (error) {
      console.error("Error updating post in localStorage", error);
    }
  },

  deletePost: (id: string) => {
    try {
      const currentPosts = postStorage.getAllPosts();
      const nextPosts = currentPosts.filter((post) => post.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPosts));
    } catch (error) {
      console.error("Error deleting post from localStorage", error);
    }
  },
};
