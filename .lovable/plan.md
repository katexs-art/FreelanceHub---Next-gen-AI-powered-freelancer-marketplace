

# Fix: "Needs configuration" Status Logic

## Problem
Every node shows "Needs configuration" (amber dot) unless it has config keys set. But trigger nodes don't need configuration — they're ready as-is. The status check is too simplistic.

## Fix

Update the configuration status logic in two files:

### 1. `src/components/workflows/WorkflowCanvas.tsx` (line 242)
Replace the simple `Object.keys(node.config).length > 0` check with a smarter `isNodeConfigured()` function:
- **Trigger nodes**: Always configured (they just listen for events)
- **Wait nodes**: Configured if `duration` is set
- **SMS nodes**: Configured if `message` is set
- **Email nodes**: Configured if `subject` is set
- **Webhook nodes**: Configured if `url` is set
- **River call nodes**: Configured if `script` is set
- **Condition nodes**: Configured if `field` is set
- **Generic action nodes** (create_contact, move_deal, etc.): Configured if `instruction` is set
- **Fallback**: `Object.keys(config).length > 0`

### 2. `src/components/workflows/NodeConfigPanel.tsx` (line 280)
Use the same `isNodeConfigured()` function for the status indicator at the bottom of the config panel.

### 3. `src/components/workflows/WorkflowTypes.ts`
Export the `isNodeConfigured()` helper so both files share the same logic.

### Implementation

```typescript
// In WorkflowTypes.ts
export function isNodeConfigured(node: WorkflowNode): boolean {
  if (node.type === "trigger") return true;
  switch (node.blockType) {
    case "send_sms": return !!node.config.message;
    case "send_email": return !!node.config.subject;
    case "wait": return !!node.config.duration;
    case "send_webhook": return !!node.config.url;
    case "river_call": return !!node.config.script;
    default:
      if (node.type === "condition") return !!node.config.field;
      return Object.keys(node.config).length > 0;
  }
}
```

| File | Change |
|------|--------|
| `src/components/workflows/WorkflowTypes.ts` | Add `isNodeConfigured()` helper |
| `src/components/workflows/WorkflowCanvas.tsx` | Import and use `isNodeConfigured()` for status dot |
| `src/components/workflows/NodeConfigPanel.tsx` | Import and use `isNodeConfigured()` for status text |
| `src/components/workflows/WorkflowBuilder.tsx` | Update Test button validation to use `isNodeConfigured()` |

