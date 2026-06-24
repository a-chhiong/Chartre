export const PRESETS = {
    // ☕ PlantUML Presets
    sequence: `@startuml Sequence
title Online Shopping Sequence

actor Customer
participant "Web Portal" as Portal
database "Inventory DB" as DB
participant "Payment Gateway" as Gateway

Customer -> Portal: Search for item
Portal -> DB: Query stock
DB --> Portal: Item available
Portal --> Customer: Display item & Buy button

Customer -> Portal: Click Buy Item
Portal -> Gateway: Authorize payment
Gateway --> Portal: Payment successful
Portal -> DB: Decrement stock count
Portal --> Customer: Show Order Confirmation page
@enduml`,

    class: `@startuml ClassDiagram
title System Class Diagram

interface Renderable {
  +render(): SVG
}

class Diagram {
  -sourceCode: String
  -format: String
  +getSVG(): SVG
}

class User {
  +name: String
  +email: String
  +createDiagram(code: String): Diagram
}

Renderable <|.. Diagram
User "1" *-- "many" Diagram : owns >
@enduml`,

    usecase: `@startuml UseCase
left to right direction
actor Customer
actor Admin

rectangle "Online Shop" {
  Customer --> (Browse Products)
  Customer --> (Checkout Order)
  Customer --> (View Order History)
  
  (Manage Inventory) <-- Admin
  (Add New Product) <-- Admin
}
@enduml`,

    activity: `@startuml Activity
title Document Approval Process

start
:Submit Document;
if (Review Required?) then (yes)
  :Assign Reviewers;
  :Perform Review;
  if (Review Status) then (approved)
    :Approve Document;
  else (rejected)
    :Reject Document;
    :Notify Author;
    stop
  endif
else (no)
  :Approve Document;
endif
:Publish Document;
stop
@enduml`,

    state: `@startuml StateDiagram
title Order Fulfillment State

[*] --> Pending : Customer places order

state Pending {
  [*] --> PaymentAuth
  PaymentAuth --> AwaitingShipping : Payment approved
  PaymentAuth --> Cancelled : Insufficient funds
}

AwaitingShipping --> Shipped : Carrier picks up package
Shipped --> Delivered : Delivery confirmation
Delivered --> [*]
Cancelled --> [*]
@enduml`,

    component: `@startuml ComponentDiagram
title Microservice Architecture

package "Frontend Client" {
  [Single Page Application] as SPA
}

package "API Gateway Layer" {
  [Reverse Proxy / Gateway] as GW
}

database "Redis Cache" as Cache

package "Core Services" {
  [Auth Service] as Auth
  [Billing Service] as Billing
}

SPA --> GW : HTTP API requests
GW --> Auth : Authenticate request
GW --> Billing : Charge user
Billing ..> Cache : Read/Write session
@enduml`,

    mindmap: `@startmindmap
* Chartre Project
** Core Engine
*** Viz.js (Graphviz)
*** PlantUML compilation (TeaVM)
** UI Layer
*** Lit web components
*** Split Pane (Draggable)
*** Theme sync (Light/Dark)
** Features
*** Live updates
*** Shareable links
*** Image exports (SVG / PNG)
@endmindmap`,

    // 🧜‍♀️ Mermaid Presets
    mermaid_flowchart: `flowchart TD
    Start --> FindItem[Search for Item]
    FindItem --> CheckStock{In Stock?}
    CheckStock -- Yes --> Buy[Buy Item]
    CheckStock -- No --> OutOfStock[Show Out of Stock]
    Buy --> Pay[Authorize Payment]
    Pay --> Success{Success?}
    Success -- Yes --> Confirm[Show Order Confirmation]
    Success -- No --> Fail[Show Payment Failure]
    Confirm --> End
    Fail --> End
    OutOfStock --> End`,

    mermaid_sequence: `sequenceDiagram
    actor Customer
    participant Portal as Web Portal
    participant DB as Inventory DB
    participant Gateway as Payment Gateway

    Customer->>Portal: Search for item
    Portal->>DB: Query stock
    DB-->>Portal: Item available
    Portal-->>Customer: Display item & Buy button

    Customer->>Portal: Click Buy Item
    Portal->>Gateway: Authorize payment
    Gateway-->>Portal: Payment successful
    Portal->>DB: Decrement stock count
    Portal-->>Customer: Show Order Confirmation page`,

    mermaid_class: `classDiagram
    class Renderable {
        <<interface>>
        +render() SVG
    }
    class Diagram {
        -sourceCode: String
        -format: String
        +getSVG() SVG
    }
    class User {
        +name: String
        +email: String
        +createDiagram(code: String) Diagram
    }
    Renderable <|.. Diagram
    User "1" *-- "many" Diagram : owns`,

    mermaid_state: `stateDiagram-v2
    [*] --> Pending : Customer places order
    
    state Pending {
        [*] --> PaymentAuth
        PaymentAuth --> AwaitingShipping : Payment approved
        PaymentAuth --> Cancelled : Insufficient funds
    }
    
    AwaitingShipping --> Shipped : Carrier picks up package
    Shipped --> Delivered : Delivery confirmation
    Delivered --> [*]
    Cancelled --> [*]`,

    mermaid_er: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses`,

    mermaid_gantt: `gantt
    title A Gantt Diagram
    dateFormat YYYY-MM-DD
    section Section
    A task          :active, a1, 2026-06-20, 30d
    Another task    :after a1, 20d`,

    mermaid_mindmap: `mindmap
  root((Chartre))
    Core Engine
      Viz.js Graphviz
      PlantUML compilation
      Mermaid Rendering
    UI Layer
      Lit Web Components
      Split Pane Draggable
      Theme Sync`
};
