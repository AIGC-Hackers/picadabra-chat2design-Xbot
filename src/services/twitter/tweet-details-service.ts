import {
  TweetData,
  TwitterMedia,
  TwitterPostReader,
  TwitterPostResponse,
  TwitterUser,
} from "../../twitter-api/api/get-post";
import { TaskRepository } from "../../db/repositories/taskRepository";
import { Task, TaskStatus } from "../../db/schema/tasks";
import type { Env } from "../../types";
import { filterTcoUrls, filterMentions } from "../../lib/utils";

/**
 * Tweet type definition for a single tweet
 */
export interface TweetType {
  text: string;
  mediaItems?: TwitterMedia[];
}

/**
 * Tweet format type definition for structured tweet content
 */
export interface TweetSource {
  referencedTweets?: TweetType[];
  tweet: TweetType;
}

/**
 * Get tweet details and update task record
 */
export async function updateTweetSource(
  taskId: string,
  tweetId: string,
  bearerToken: string,
  env: Env
): Promise<Task | null> {
  console.log(`Getting tweet details: ${tweetId}`);
  const postReader = new TwitterPostReader(bearerToken);
  const taskRepo = new TaskRepository(env);

  try {
    // Get tweet data
    const postDetail = await postReader.getPost(tweetId);

    // Extract user information
    const user = postDetail.includes?.users?.find(
      (user: TwitterUser) => user.id === postDetail.data.author_id
    );

    // Prepare tweet text
    const tweetSource = prepareTweetSource(postDetail);

    // Update database
    return await taskRepo.updateOriginalTweet(
      taskId,
      JSON.stringify(tweetSource),
      null,
      user
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to get tweet details: ${errorMessage}`);

    await taskRepo.updateStatus(
      taskId,
      TaskStatus.FAILED,
      `Failed to get post details, error: ${errorMessage}`
    );

    throw error;
  }
}

/**
 * Prepare the merged tweet text with referenced tweets
 */
function prepareTweetSource(postDetail: TwitterPostResponse): TweetSource {
  const tweetSource: TweetSource = {
    tweet: {
      text: "",
      mediaItems: [],
    },
  };

  // Process main tweet text
  tweetSource.tweet.text = filterTcoUrls(filterMentions(postDetail.data.text));

  // Process main tweet images
  if (postDetail.data.attachments?.media_keys && postDetail.includes?.media) {
    const tweetMediaItems = postDetail.includes.media.filter(
      (media: TwitterMedia) =>
        postDetail.data.attachments?.media_keys.includes(media.media_key)
    );
    tweetSource.tweet.mediaItems = tweetMediaItems;
  }

  // Process referenced tweets
  if (postDetail.includes?.tweets && postDetail.data.referenced_tweets) {
    tweetSource.referencedTweets = [];

    for (const refTweet of postDetail.data.referenced_tweets) {
      const referencedTweet = postDetail.includes.tweets.find(
        (t: TweetData) => t.id === refTweet.id
      );

      if (referencedTweet) {
        const refTweetItem: TweetType = {
          text: filterTcoUrls(filterMentions(referencedTweet.text)),
          mediaItems: [],
        };

        // Process referenced tweet images
        if (
          referencedTweet.attachments?.media_keys &&
          postDetail.includes.media
        ) {
          const refTweetMediaItems = postDetail.includes.media.filter(
            (media: TwitterMedia) =>
              referencedTweet.attachments?.media_keys.includes(media.media_key)
          );
          refTweetItem.mediaItems = refTweetMediaItems;
        }

        tweetSource.referencedTweets.push(refTweetItem);
      }
    }
  }

  return tweetSource;
}
