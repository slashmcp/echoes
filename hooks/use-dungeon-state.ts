'use client'

/**
 * useDungeonState
 *
 * Manages persistent dungeon entity state backed by Supabase.
 *
 * On mount it fetches all entity_interactions for the current dungeon instance
 * and room, returning a hydration-ready array of destroyed/looted entities.
 *
 * recordInteraction() is optimistic: it immediately updates the local ref,
 * then debounces a Supabase UPSERT (300 ms) so network latency is invisible
 * during intense combat.
 *
 * Usage:
 *   const { interactions, recordInteraction, isLoading } = useDungeonState({
 *     dungeonInstanceId,
 *     roomId: 'ignis_arena',
 *   })
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type InteractionType = 'destroyed' | 'looted' | 'activated'

export interface EntityInteraction {
  entityId: string
  interactionType: InteractionType
  payload: Record<string, unknown>
}

interface UseDungeonStateOptions {
  /** UUID of the active dungeon_instance row */
  dungeonInstanceId: string | null
  /** Identifies which room (e.g. 'ignis_arena', 'antechamber') */
  roomId: string
}

interface UseDungeonStateReturn {
  interactions: EntityInteraction[]
  recordInteraction: (
    entityId: string,
    type: InteractionType,
    payload?: Record<string, unknown>
  ) => void
  isLoading: boolean
  error: string | null
}

export function useDungeonState({
  dungeonInstanceId,
  roomId,
}: UseDungeonStateOptions): UseDungeonStateReturn {
  const [interactions, setInteractions] = useState<EntityInteraction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Local shadow of interactions for optimistic updates — never triggers re-render
  const interactionsRef = useRef<EntityInteraction[]>([])

  // Debounce timer ref for batching rapid Supabase writes
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Queue of pending UPSERT payloads
  const pendingRef = useRef<EntityInteraction[]>([])

  const supabase = createClient()

  // ── Initial hydration ────────────────────────────────────────────────────
  useEffect(() => {
    if (!dungeonInstanceId) return

    let cancelled = false
    setIsLoading(true)
    setError(null)

    async function fetchInteractions() {
      try {
        const { data, error: fetchError } = await supabase
          .from('entity_interactions')
          .select('entity_id, interaction_type, payload')
          .eq('dungeon_instance_id', dungeonInstanceId)
          .eq('room_id', roomId)

        if (cancelled) return
        if (fetchError) throw fetchError

        const hydrated: EntityInteraction[] = (data ?? []).map((row) => ({
          entityId: row.entity_id as string,
          interactionType: row.interaction_type as InteractionType,
          payload: (row.payload as Record<string, unknown>) ?? {},
        }))

        interactionsRef.current = hydrated
        setInteractions(hydrated)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dungeon state.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void fetchInteractions()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dungeonInstanceId, roomId])

  // ── Debounced Supabase UPSERT ─────────────────────────────────────────────
  const flushPending = useCallback(async () => {
    if (!dungeonInstanceId || pendingRef.current.length === 0) return
    const batch = [...pendingRef.current]
    pendingRef.current = []

    const rows = batch.map((interaction) => ({
      dungeon_instance_id: dungeonInstanceId,
      room_id: roomId,
      entity_id: interaction.entityId,
      interaction_type: interaction.interactionType,
      payload: interaction.payload,
    }))

    try {
      const { error: upsertError } = await supabase
        .from('entity_interactions')
        .upsert(rows, { onConflict: 'dungeon_instance_id,room_id,entity_id' })

      if (upsertError) {
        console.error('[useDungeonState] UPSERT failed:', upsertError.message)
      }
    } catch (err) {
      console.error('[useDungeonState] UPSERT error:', err)
    }
  }, [dungeonInstanceId, roomId, supabase])

  // ── Public API ────────────────────────────────────────────────────────────
  const recordInteraction = useCallback(
    (
      entityId: string,
      type: InteractionType,
      payload: Record<string, unknown> = {}
    ) => {
      // Optimistic: update local ref and React state immediately
      const interaction: EntityInteraction = {
        entityId,
        interactionType: type,
        payload,
      }

      // Replace or append in local shadow
      const existing = interactionsRef.current.findIndex(
        (i) => i.entityId === entityId
      )
      if (existing >= 0) {
        interactionsRef.current[existing] = interaction
      } else {
        interactionsRef.current.push(interaction)
      }
      setInteractions([...interactionsRef.current])

      // Queue for debounced Supabase write
      if (dungeonInstanceId) {
        pendingRef.current.push(interaction)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          void flushPending()
        }, 300)
      }
    },
    [dungeonInstanceId, flushPending]
  )

  // Flush any pending writes on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      void flushPending()
    }
  }, [flushPending])

  return { interactions, recordInteraction, isLoading, error }
}
