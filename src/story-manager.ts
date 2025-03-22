// Add this function to StoryManager class
async scheduleStoryPosts(): Promise<void> {
    setInterval(async () => {
        const currentState = await this.getContextState(); // Assume this function retrieves the current story state
        await this.createNewStoryPost(currentState);
    }, 4 * 60 * 60 * 1000); // Schedule every 4 hours
}
