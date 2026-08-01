from fastmcp import FastMCP
from echoes_v3.game.mechanics import calculate_xp

mcp = FastMCP("echoes-oracle")

@mcp.tool()
def complete_task(task_id: int, difficulty: float, minutes_spent: int) -> str:
    """
    Completes a real-world task and awards XP to the Skeleton Knight.
    The Oracle calls this tool when the user reports finishing a task.
    
    Args:
        task_id: The ID of the task
        difficulty: The difficulty multiplier (1.0 to 3.0)
        minutes_spent: How long the task took (e.g. Pomodoro minutes)
    """
    xp_gained = calculate_xp(minutes_spent, difficulty)
    # In a real app, this would update a database and trigger a UI state change
    return f"Task {task_id} completed. Awarded {xp_gained} XP to the Skeleton Knight!"

@mcp.tool()
def start_focus_timer(minutes: int) -> str:
    """
    Starts a focus timer. This sets the Skeleton Knight into a 'Walk' or 'Run' state.
    """
    return f"Focus timer started for {minutes} minutes. The Knight is now walking!"

if __name__ == "__main__":
    mcp.run(transport='stdio')
