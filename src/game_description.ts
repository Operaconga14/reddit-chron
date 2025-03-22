export interface GameConfig {
    postIntervalHours: number;
    minVotesRequired: number;
}

export const GAME_CONFIG: GameConfig = {
    postIntervalHours: 3,
    minVotesRequired: 1 // Can be adjusted based on community size
};

export const GAME_DESCRIPTION = {
    title: "Reddit Chronicles: The People's Quest",
    subtitle: "A Massively Multiplayer Storytelling Experience",
    question: "🏆 What is Reddit Chronicles?",
    briefIntro1: "An AI-driven storytelling game where Redditors shape the story.",
    briefIntro2: `Every ${GAME_CONFIG.postIntervalHours} hours, a new chapter emerges from the top-voted choice.`,
    introduction: `🏆 What is Reddit Chronicles?
Reddit Chronicles is an AI-powered, crowd-controlled\n
storytelling game where Redditors decide the fate of\n
the story. Every ${GAME_CONFIG.postIntervalHours} hours,\n
the game posts a new chapter based on the most-voted decision.`,

    keyFeatures: ["⚔️ Your votes shape the adventure.", "📖 AI writes the next chapter.", "🗺️ The story evolves with every choice."],

    howToPlay: {
        title: "🎮 How to Play",
        steps: [
            "A new story chapter appears in the subreddit.",
            "Choose your action by clicking one of the interactive buttons.",
            "Vote with the crowd to decide what happens next.",
            `Every ${GAME_CONFIG.postIntervalHours} hours, the winning choice is used to generate the next part of the story.`,
            "The game never ends—every choice creates a unique adventure!"
        ]
    },

    mechanics: {
        title: "⚙️ How It Works",
        steps: [
            "✅ The game posts a story prompt with multiple choices.",
            "✅ Users vote by clicking interactive buttons.",
            `✅ Every ${GAME_CONFIG.postIntervalHours} hours, the most-voted option is sent to TogetherAI.`,
            "✅ AI generates the next chapter, and a new post is created.",
            "✅ The cycle continues, shaping a dynamic, crowd-driven epic!"
        ]
    }
};

export function formatGameDescription(): string {
    const { title, subtitle, introduction, keyFeatures, howToPlay, mechanics } = GAME_DESCRIPTION;

    return `# ${title}
${subtitle}

${introduction}

${keyFeatures.join("\n")}

## ${howToPlay.title}
${howToPlay.steps.map((step) => `- ${step}`).join("\n")}

## ${mechanics.title}
${mechanics.steps.join("\n")}`;
}

export function formatGameRules(): string {
    return `# Game Rules
1. Each story chapter will have multiple choice options
2. Vote by clicking the interactive buttons below the post
3. The most voted option after ${GAME_CONFIG.postIntervalHours} hours will determine the next chapter
4. A minimum of ${GAME_CONFIG.minVotesRequired} votes is required for the story to progress
5. Be respectful and follow subreddit rules
6. Have fun and be creative with your choices!`;
}
