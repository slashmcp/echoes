def calculate_xp(minutes_spent: int, difficulty: float) -> int:
    """
    Calculates the Experience Points (XP) awarded to the Skeleton Knight.
    Based on the Strategic Inquiry 3 choice: Time-based + Complexity multiplier.
    
    Formula: Base XP (minutes) * Difficulty Multiplier
    
    Args:
        minutes_spent: E.g., 25 for a standard Pomodoro.
        difficulty: Float between 1.0 (easy) and 3.0 (hard).
    """
    base_xp = minutes_spent * 10
    total_xp = int(base_xp * difficulty)
    return total_xp
