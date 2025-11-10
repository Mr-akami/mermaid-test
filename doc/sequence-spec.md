Mermaid Sequence Diagram Editor - Specification
0. Scope
This specification defines requirements for implementing a GUI sequence diagram editor that supports Mermaid's sequenceDiagram syntax.
The editor must:

Fully represent and edit Mermaid sequence diagram syntax (bidirectional sync: GUI ⇔ Mermaid text)
Maintain a model that considers Mermaid constraints and version differences

1. Diagram Level
1.1 Diagram Type Declaration
The opening keyword is sequenceDiagram. The editor always treats diagrams as this type.
1.2 Handling the end Keyword
Blocks (loop, alt, opt, par, critical, break, box, rect) close with end. The word "end" in regular text can break parsing, so it must be wrapped as (end), [end], {end}, or "end". The editor should include a model that warns about this constraint during text editing.
2. Participants and Actors
2.1 Defining Participants

Implicit definition: Identifiers in messages automatically become participants
Explicit definition: participant <id>, participant <id> as <label>, actor <id>, actor <id> as <label>

Display order: explicit definitions first (in order), then implicit ones (in first appearance order).
2.2 Actor vs Participant

participant: Rectangular lifeline box
actor: Human icon

The GUI should allow switching between types.
2.3 Aliases
The model should separate internal ID from display label as distinct properties.
Example: participant A as Alice
2.4 Multi-line Names
Display names can include <br/> for multi-line display using alias syntax.
Example: participant Alice as Alice<br/>Johnson
3. Actor Creation and Destruction (v10.3.0+)
3.1 Creation
Syntax: create participant <id> or create actor <id> as <label>
Creates a lifeline starting at the first received message. Creation is only valid for recipients.
3.2 Destruction
Syntax: destroy <id>
Must align with destruction messages like -x or --x. The editor should validate consistency.
4. Grouping / Box
4.1 Purpose
Group participants vertically.
4.2 Syntax
box <ColorOrName> <optional description>
  ... participant definitions ...
end
4.3 Color Options

box Aqua Group Description
box Group without description
box rgb(r,g,b) or box rgba(r,g,b,a)
box transparent <name>: forces transparency even if name is a color

4.4 Requirements
The GUI should allow editing box ranges, contained participants, labels, and colors.
5. Messages
5.1 Basic Syntax
[sender][arrow][receiver]:<message text>
Message text is optional.
5.2 Arrow Types (10 types)

->: solid line, no arrowhead
-->: dashed line, no arrowhead
->>: solid line, arrowhead
-->>: dashed line, arrowhead
<<->>: solid line, both ends (v11.0.0+)
<<-->>: dashed line, both ends (v11.0.0+)
-x: solid line, × at end (deletion/error)
--x: dashed line, × at end
-): solid line, open arrowhead (async)
--)): dashed line, open arrowhead (async)

5.3 Line Breaks in Messages
Use <br/> for multi-line messages.
5.4 Requirements
The GUI should allow selecting arrow types and editing message text (including <br/>).
6. Activation (Lifeline Activation)
6.1 Explicit Notation

activate <Actor>
deactivate <Actor>

6.2 Shorthand
Add + or - to arrow: A->>+B activates B; B-->>-A deactivates A.
6.3 Stacking
Multiple nested activations on the same actor are allowed.
6.4 Requirements
The model should represent nested activations.
7. Notes
7.1 Single Participant
Syntax: Note right of <Actor>: <text> or Note left of <Actor>: ...
7.2 Multiple Participants
Syntax: Note over <Actor1>,<Actor2>: <text>
7.3 Line Breaks
Use <br/> for multi-line notes.
7.4 Requirements
The GUI should allow editing position (left/right/over), target actors, and text.
8. Control Structures
All blocks contain statements and close with end.
8.1 Loop
loop <label>
  ... statements ...
end
8.2 Alt / Opt
alt <condition>
  ...
else <condition>
  ...
end
opt has no else clause.
8.3 Parallel (par)
par <label1>
  ...
and <label2>
  ...
and <labelN>
  ...
end
Nesting is allowed.
8.4 Critical Region
critical <required action>
  ...
option <situation A>
  ...
option <situation B>
  ...
end
Options are optional. Nesting is allowed.
8.5 Break
break <description>
  ...
end
9. Background Highlight (rect)
9.1 Syntax
rect <COLOR>
  ... content ...
end
9.2 Color
Use rgb(r,g,b) or rgba(r,g,b,a).
9.3 Requirements
The GUI should allow adding colored highlight blocks to any region, with messages and notes inside.
10. Comments
10.1 Syntax
%% at line start (or after indentation) starts a comment until line end.
10.2 Requirements
The editor should preserve comments but optionally hide them from display.
11. Entity Codes (Escaping)
11.1 Character References
Messages and notes can use #number; or HTML entity names.
Example: #9829; → ♥, #35; → #
For semicolon: use #59;.
11.2 Requirements
The GUI should display interpreted entities while internally preserving the original codes.
12. Sequence Numbers
12.1 Activation
Include autonumber line in the diagram.
12.2 Behavior
Subsequent messages display auto-incrementing numbers.
12.3 Requirements
The GUI should have an "auto-numbering" flag; when ON, include autonumber in Mermaid output.
13. Actor Links
13.1 Simple Syntax
link <actor>: <label> @ <url>
Multiple definitions per actor are allowed.
13.2 Advanced JSON Syntax
links <actor>: {"Label1": "url1", "Label2": "url2"}
13.3 Requirements
The GUI should allow attaching 0..N links (label + URL) to each participant/actor.
14. Styling and Configuration
14.1 Style Classes
The following class names are used by Mermaid:

actor, actor-top, actor-bottom, text.actor, actor-line
messageLine0, messageLine1, messageText
labelBox, labelText, loopText, loopLine
note, noteText

The GUI should support theme application and output extension at the class level.
14.2 sequenceConfig Parameters

Margins: diagramMarginX, diagramMarginY, boxTextMargin, noteMargin, messageMargin
mirrorActors: display actors top and bottom
Fonts: actorFontSize, actorFontFamily, actorFontWeight, noteFontSize, noteFontFamily, noteFontWeight, messageF ontSize, messageFontFamily, messageFontWeight

The editor should preserve these settings per diagram and apply them to Mermaid output.