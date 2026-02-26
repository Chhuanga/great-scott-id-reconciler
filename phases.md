Phase 1: Database Setup & Modeling
The foundation of the system is the Contact table. You need to ensure the schema allows for self-referencing links.
+1

Initialize the SQL Database: Set up a relational database (PostgreSQL or MySQL).

Create the Contact Table: Implement the schema with the following constraints:

id: Primary Key (Auto-increment).

email and phoneNumber: String fields (Nullable).
+1

linkedId: Integer that references another Contact.id (Nullable).

linkPrecedence: Enum with values "primary" or "secondary".

Indices: Add indices on email and phoneNumber for fast lookups during reconciliation.

Phase 2: Core Reconciliation Logic
This is the "brain" of the service located inside the /identify endpoint.

Search Phase: Query the database for any records matching the incoming email OR phoneNumber.

Scenario Branching:

No Matches: Create a new record with linkPrecedence: "primary" and linkedId: null.

Partial Match: If you find matches but the request contains new info (e.g., an email you haven't seen but a phone number you have), create a new secondary record linked to the existing primary.

Conflict/Merge: If the request links two different existing primary records, "demote" the newer primary to secondary and update its linkedId to the older primary's ID.

Phase 3: Data Aggregation & Response
Once the database state is updated, you must gather the full identity "cluster" to return the response.
+1

Find the Root: Identify the true Primary ID for the current chain.
+1

Fetch the Cluster: Query all records where id = primaryId OR linkedId = primaryId.

Format the JSON:

emails: Extract all unique emails, ensuring the Primary email is the first element.

phoneNumbers: Extract all unique phone numbers, ensuring the Primary phone is the first element.
+1

secondaryContactIds: An array of all IDs that are not the primary ID.

Phase 4: Error Handling & Edge Cases
As a Senior Engineer, you must ensure the system doesn't break under weird conditions.

Atomic Transactions: Wrap the search-and-update logic in a SQL Transaction. This prevents "race conditions" where two identical requests processed at the same time create duplicate primary records.

Null Inputs: Handle cases where only an email or only a phone number is provided in the request.
+2

Deep Linking: Ensure that if a secondary record is matched, your logic travels "up the chain" to find the original Primary ID.

Phase 5: Deployment & Documentation
Environment Config: Use .env files for database credentials.

Github Submission: Commit your code with clear, insightful messages.

Hosting: Deploy the app to a platform like Render or Railway and ensure the /identify endpoint is public.

README: Include instructions on how to run the app locally and the link to your hosted endpoint.
