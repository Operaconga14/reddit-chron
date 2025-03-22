import 'openai/shims/web';
import { Devvit, useState } from '@devvit/public-api';
import type { Post, RedditAPIClient } from '@devvit/public-api';
import { GAME_DESCRIPTION, GAME_CONFIG } from './game_description.js';
import { STORY_CONTINUATIONS, CHOICE_TEMPLATES, determineStoryType, getRandomItem } from './story_content.js'
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { environment } from './environments';

globalThis.Request = globalThis.Request || require( 'node-fetch' ).Request;
globalThis.fetch = globalThis.fetch || require( 'node-fetch' );

const AI_PROVIDER = 'openai';
const GEMINI_API_KEY = environment.GEMINI_API_KEY
// const openai = new OpenAI( { apiKey: environment.OPENAI_API_KEY } );
const geminiai = new GoogleGenerativeAI( GEMINI_API_KEY )
const model = geminiai.getGenerativeModel( { model: 'gemini-1.5-flash' } )

// const generationConfig = {
//     temperature: 1,
//     topP: 0.95,
//     topK: 40,
//     maxOutputTokens: 8192,
//     responseMimeType: "text/plain",
// }

interface RedditPost extends Post {
    postMetadata?: {
        winningChoice?: string;
        currentStory?: string;
        votes?: Record<string, number>;
    };
}

interface RedditAPIResponse {
    data: {
        children: Array<{
            data: RedditPost;
        }>;
    };
}


// Schedule next story update
Devvit.addSchedulerJob( {
    name: 'update_story',
    onRun: async ( event, context ) =>
    {
        const { reddit, scheduler } = context;

        try
        {
            // Get the current subreddit
            const subreddit = await reddit.getCurrentSubreddit();

            // Find the most recent story post
            const response = await reddit.getNewPosts( { subredditName: subreddit.name, limit: 5 } ) as unknown as RedditAPIResponse;
            const storyPosts = response.data.children.map(child => child.data);
            const storyPost = storyPosts.find(post => post.title === 'Reddit Chronicles');


            if ( !storyPost )
            {
                console.error( 'No story post found' );
                return;
            }

            // Get the winning choice from post metadata
            const post = await reddit.getPostById( storyPost.id ) as RedditPost;
            const winningChoice = post?.postMetadata?.winningChoice;
            const currentStory = post?.postMetadata?.currentStory;

            if ( !winningChoice || !currentStory )
            {
                console.error( 'No winning choice or current story found' );
                return;
            }

            // Generate next chapter
            const storyType = determineStoryType( currentStory );
            const { text: nextChapter, choices: nextChoices } = await generateNextChapter(
                storyType,
                currentStory,
                winningChoice
            );

            // Create new post with next chapter
            const newPost = await reddit.submitPost( {
                title: 'Reddit Chronicles',
                subredditName: subreddit.name,
                preview: (
                    <vstack height="100%" width="100%" alignment="middle center">
                        <text size="large">Loading next chapter...</text>
                    </vstack>
                ),
            } );

            // Schedule next update
            await scheduler.runJob( {
                name: 'update_story',
                data: { postId: newPost.id },
                runAt: new Date( Date.now() + GAME_CONFIG.postIntervalHours * 60 * 60 * 1000 ),
            } );

        } catch ( error )
        {
            console.error( 'Error updating story:', error );
        }
    }
} );



async function generateNextChapter(
    storyType: keyof typeof STORY_CONTINUATIONS,
    story: string,
    choice: string
): Promise<{ text: string; choices: string[] }>
{

    // Get a random story continuation
    const continuations = STORY_CONTINUATIONS[ storyType ];
    const nextPart = continuations[ Math.floor( Math.random() * continuations.length ) ] || "The story continues...";

    // Get predefined choices or fallback to generic ones
    const choices = CHOICE_TEMPLATES[ storyType ]?.[
        Math.floor( Math.random() * CHOICE_TEMPLATES[ storyType ].length )
    ] || [ "Choice A", "Choice B", "Choice C" ];

    return { text: nextPart, choices };
}

Devvit.configure( {
    redditAPI: true,
    http: true
} );

enum PageType
{
    RULES_PAGE,
    STORY_SELECTION_PAGE,
    STORY_PAGE,
}

const INITIAL_STORIES: string[] = [
    "A lost explorer in an ancient jungle finds a mysterious temple.",
    "A detective receives an anonymous letter that changes everything.",
    "A young girl discovers she has the ability to travel through time.",
    "A spaceship crash-lands on an unknown planet filled with strange creatures.",
];

Devvit.addMenuItem( {
    label: 'Start Reddit Chronicles',
    location: 'subreddit',
    forUserType: 'moderator',
    onPress: async ( _event, context ) =>
    {
        const { reddit, ui } = context;
        ui.showToast( "Submitting your post - upon completion you'll navigate there." );
        const subreddit = await reddit.getCurrentSubreddit();
        const post = await reddit.submitPost( {
            title: 'Reddit Chronicles',
            subredditName: subreddit.name,
            preview: (
                <vstack height="100%" width="100%" alignment="middle center">
                    <text size="large">Loading ...</text>
                </vstack>
            ),
        } );
        ui.navigateTo( post );
    },
} );

type StoryState = {
    chapter: number;
    content: string;
    choices: string[];
    lastUpdate: string;
    votes: { [ key: string ]: number };
    winningChoice?: string;
};

type AppProps = {
    navigate: ( page: PageType ) => void;
    story: string;
    choices: string[];
    setStory: ( story: string ) => void;
    setChoices: ( choices: string[] ) => void;
    currentStory: StoryState;
    setCurrentStory: ( story: StoryState ) => void;
    handleChoiceSelection: ( choice: string ) => void;
};

const App = () =>
{
    const [ page, setPage ] = useState<PageType>( PageType.RULES_PAGE );
    const [ story, setStory ] = useState<string>( INITIAL_STORIES[ 0 ] );
    const [ choices, setChoices ] = useState<string[]>( [] );
    const [ currentStory, setCurrentStory ] = useState<StoryState>( {
        chapter: 1,
        content: "",
        choices: [],
        lastUpdate: new Date().toISOString(),
        votes: {},
    } );

    const handleChoiceSelection = async ( choice: string ) =>
    {
        console.log( "User choice:", choice );
        const storyType = determineStoryType( currentStory.content );
        const { text, choices } = await generateNextChapter( storyType, currentStory.content, choice );
        console.log( "AI Response:", text, choices ); // Debugging AI output
        setCurrentStory( prev => ( {
            ...prev,
            chapter: prev.chapter + 1,
            content: text,
            choices: choices,
            lastUpdate: new Date().toISOString(),
        } ) );
    };

    const props: AppProps = {
        navigate: setPage,
        story,
        choices,
        setStory,
        setChoices,
        currentStory,
        setCurrentStory,
        handleChoiceSelection,
    };

    return page === PageType.STORY_PAGE ? (
        <StoryPage
            currentStory={currentStory}
            handleChoiceSelection={handleChoiceSelection}
            setCurrentStory={setCurrentStory}
        />
    ) : page === PageType.STORY_SELECTION_PAGE ? (
        <StorySelectionPage {...props} />
    ) : (
        <RulesPage {...props} />
    );
};



const RulesPage = ( { navigate }: { navigate: ( page: PageType ) => void } ) =>
{
    return (
        <blocks height='tall'>
            <vstack padding="medium" width="100%" grow={true} alignment='top center' gap='large'>
                <vstack gap='small'>
                    <text size="xxlarge" weight="bold" alignment='center'>📜 {GAME_DESCRIPTION.title}</text>
                    <text alignment='center' size='large'>{GAME_DESCRIPTION.subtitle}</text>
                    <text alignment='center'>{GAME_DESCRIPTION.question}</text>
                    <text alignment='center'>{GAME_DESCRIPTION.briefIntro1}</text>
                    <text alignment='center'>{GAME_DESCRIPTION.briefIntro2}</text>
                    <text size="xxlarge" weight="bold" alignment='center'>📜 Game Rules</text>
                    <text>1️⃣ Choose a story from the available options.</text>
                    <text>2️⃣ Vote by clicking the interactive buttons below the post.</text>
                    <text>3️⃣ The most voted option after {GAME_CONFIG.postIntervalHours} hours will determine the next chapter.</text>
                    <text>4️⃣ A minimum of {GAME_CONFIG.minVotesRequired} votes is required for the story to progress.</text>
                    <text>5️⃣ Have fun and be creative with your choices!</text>
                </vstack>
                <button appearance="primary" onPress={() => navigate( PageType.STORY_SELECTION_PAGE )}>
                    📖 Start a Story
                </button>
            </vstack>
        </blocks>
    );
};


const StorySelectionPage = ( { navigate, setStory }: { navigate: ( page: PageType ) => void; setStory: ( story: string ) => void } ) => (
    <blocks height='tall'>
        <vstack width="100%" grow={true} alignment='top center' gap='large' padding='medium'>
            <text size="large">Select Your Story</text>
            {Object.keys( STORY_CONTINUATIONS ).map( ( story ) => (
                <button key={story} onPress={() =>
                {
                    setStory( story );
                    navigate( PageType.STORY_PAGE );
                }}>{story}</button>
            ) )}
        </vstack>
    </blocks>
);

const StoryPage = ( { currentStory, handleChoiceSelection, setCurrentStory }: {
    currentStory: StoryState;
    handleChoiceSelection: ( choice: string ) => void;
    setCurrentStory: ReturnType<typeof useState<StoryState>>[ 1 ];
} ) =>
{
    const storyType = determineStoryType( currentStory.content || "" );
    const choices = CHOICE_TEMPLATES[ storyType ] ? getRandomItem( CHOICE_TEMPLATES[ storyType ] ) : [];

    const handleVote = ( choice: string ) =>
    {
        setCurrentStory( ( prev: StoryState ): StoryState =>
        {
            const updatedVotes = { ...prev.votes };
            updatedVotes[ choice ] = ( updatedVotes[ choice ] || 0 ) + 1;

            // Find the choice with the highest votes
            let maxVotes = 0;
            let winningChoice: string | undefined = undefined;
            Object.entries( updatedVotes ).forEach( ( [ key, votes ] ) =>
            {
                const voteCount = votes as number;
                if ( voteCount > maxVotes )
                {
                    maxVotes = voteCount;
                    winningChoice = key;
                }
            } );

            const updatedStory: StoryState = {
                chapter: prev.chapter,
                content: prev.content,
                choices: prev.choices,
                lastUpdate: prev.lastUpdate,
                votes: updatedVotes,
                winningChoice: winningChoice
            };

            // Log the vote for debugging
            console.log('Vote recorded for:', choice);

return updatedStory;
        });

// After updating votes, proceed with the choice selection
handleChoiceSelection( choice );
    };

return (
    <blocks height="tall">
        <vstack width="100%" grow={true} alignment="top center" gap="large" padding="medium">
            <text size="large">Chapter {currentStory.chapter}</text>
            <text>{currentStory.content || "The story begins..."}</text>
            {choices.map( ( choice ) => (
                <button key={choice} onPress={() => handleVote( choice )}>
                    {choice}
                </button>
            ) )}
        </vstack>
    </blocks>
);
};

Devvit.addCustomPostType( {
    name: 'Reddit Chronicles',
    description: 'A story-driven game where the community decides the fate of the protagonist.',
    render: App,
} );

export default Devvit;
