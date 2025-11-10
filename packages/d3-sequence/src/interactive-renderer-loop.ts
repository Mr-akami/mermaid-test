/**
 * Loop-related methods for InteractiveSequenceRenderer
 * To be merged into the main class
 */

// Add these methods to InteractiveSequenceRenderer class:

/**
 * Create a loop from selection rectangle
 */
createLoopFromSelection(x1: number, y1: number, x2: number, y2: number): void {
  const selX = Math.min(x1, x2);
  const selY = Math.min(y1, y2);
  const selWidth = Math.abs(x2 - x1);
  const selHeight = Math.abs(y2 - y1);

  console.log('Creating loop from selection:', { selX, selY, selWidth, selHeight });

  // Find messages within the selection
  const selectedMessageIndices: number[] = [];
  for (const layout of this.messageLayouts) {
    // Check if message Y is within selection
    if (layout.y >= selY && layout.y <= selY + selHeight) {
      selectedMessageIndices.push(layout.index);
    }
  }

  console.log('Selected message indices:', selectedMessageIndices);

  if (selectedMessageIndices.length === 0) {
    alert('No messages selected. Please drag over messages to create a loop.');
    return;
  }

  // Prompt for loop label
  const label = prompt('Enter loop label:', 'Every minute') || 'loop';

  // Find the first and last message indices to wrap
  const minIndex = Math.min(...selectedMessageIndices);
  const maxIndex = Math.max(...selectedMessageIndices);

  // Extract messages from diagram.elements
  const messagesToWrap: any[] = [];
  const remainingElements: any[] = [];

  this.diagram.elements.forEach((el, idx) => {
    if (el.type === 'message' && idx >= minIndex && idx <= maxIndex) {
      messagesToWrap.push(el);
    } else if (idx < minIndex || idx > maxIndex) {
      remainingElements.push(el);
    }
  });

  // Create loop element
  const loop: Loop = {
    type: 'loop',
    label,
    statements: messagesToWrap
  };

  // Reconstruct elements array
  this.diagram.elements = [
    ...remainingElements.slice(0, minIndex),
    loop,
    ...remainingElements.slice(minIndex)
  ];

  console.log('Loop created:', loop);

  // Re-render
  this.render();
  this.notifyChange();

  // Switch back to select tool
  this.setTool('select');
}

/**
 * Layout loops
 */
layoutLoops(): void {
  this.loopLayouts = [];

  let currentMessageIndex = 0;

  this.diagram.elements.forEach((element, elemIndex) => {
    if (element.type === 'loop') {
      const loop = element as Loop;

      // Find messages in this loop
      const messageIndices: number[] = [];
      let minY = Infinity;
      let maxY = -Infinity;

      loop.statements.forEach(stmt => {
        if (stmt.type === 'message') {
          // Find this message in messageLayouts
          const layout = this.messageLayouts.find(l => l.message === stmt);
          if (layout) {
            messageIndices.push(layout.index);
            minY = Math.min(minY, layout.y);
            maxY = Math.max(maxY, layout.y);
          }
        }
        currentMessageIndex++;
      });

      if (messageIndices.length > 0) {
        // Calculate loop bounds
        const minX = Math.min(...this.participantLayouts.map(p => p.x)) - 80;
        const maxX = Math.max(...this.participantLayouts.map(p => p.x)) + 80;

        this.loopLayouts.push({
          index: elemIndex,
          x: minX,
          y: minY - 30,
          width: maxX - minX,
          height: maxY - minY + 60,
          loop,
          messageIndices
        });
      }
    } else if (element.type === 'message') {
      currentMessageIndex++;
    }
  });
}

/**
 * Render loops
 */
renderLoops(): void {
  if (!this.mainGroup) return;

  for (const layout of this.loopLayouts) {
    const group = this.mainGroup.append('g')
      .attr('class', 'loop-block')
      .attr('data-index', layout.index);

    // Background
    group.append('rect')
      .attr('class', 'loop-background')
      .attr('x', layout.x)
      .attr('y', layout.y)
      .attr('width', layout.width)
      .attr('height', layout.height)
      .attr('fill', 'rgba(200, 230, 255, 0.1)')
      .attr('stroke', '#3498db')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '10,5')
      .attr('rx', 5);

    // Label box
    group.append('rect')
      .attr('x', layout.x)
      .attr('y', layout.y)
      .attr('width', 100)
      .attr('height', 25)
      .attr('fill', '#3498db')
      .attr('stroke', '#2980b9')
      .attr('stroke-width', 2)
      .attr('rx', 3);

    group.append('text')
      .attr('x', layout.x + 50)
      .attr('y', layout.y + 12.5)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text(`loop [${layout.loop.label}]`);

    // Add drag behavior
    const drag = d3.drag<SVGGElement, unknown>()
      .on('drag', (event) => {
        if (this.currentTool === 'select') {
          layout.x += event.dx;
          layout.y += event.dy;

          group.select('.loop-background')
            .attr('x', layout.x)
            .attr('y', layout.y);

          group.selectAll('rect:nth-child(2), text')
            .attr('x', function() {
              const currentX = parseFloat(d3.select(this).attr('x'));
              return currentX + event.dx;
            })
            .attr('y', function() {
              const currentY = parseFloat(d3.select(this).attr('y'));
              return currentY + event.dy;
            });
        }
      });

    group.call(drag as any);

    // Add resize handles
    this.addLoopResizeHandles(group, layout);

    // Click handler
    group.on('click', (event) => {
      if (this.currentTool === 'select') {
        event.stopPropagation();
        this.selectElement({ type: 'loop', data: layout.loop, index: layout.index });
      }
    });
  }
}

/**
 * Add resize handles to loop
 */
addLoopResizeHandles(group: any, layout: LoopLayout): void {
  const handleSize = 10;

  // Bottom-right resize handle
  const handle = group.append('rect')
    .attr('class', 'resize-handle')
    .attr('x', layout.x + layout.width - handleSize)
    .attr('y', layout.y + layout.height - handleSize)
    .attr('width', handleSize)
    .attr('height', handleSize);

  const resizeDrag = d3.drag<SVGRectElement, unknown>()
    .on('drag', (event) => {
      layout.width = Math.max(100, layout.width + event.dx);
      layout.height = Math.max(60, layout.height + event.dy);

      group.select('.loop-background')
        .attr('width', layout.width)
        .attr('height', layout.height);

      handle
        .attr('x', layout.x + layout.width - handleSize)
        .attr('y', layout.y + layout.height - handleSize);
    })
    .on('end', () => {
      this.notifyChange();
    });

  handle.call(resizeDrag as any);
}
