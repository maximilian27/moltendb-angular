import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {injectLiveQuery, MoltenService} from "@moltendb-web/angular";

// 1. Define the shape of your document
interface UserDoc {
  _key: string;
  name: string;
  role: string;
}
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private molten = inject(MoltenService);
// Boom! Type-safe, auto-updating, memory-leak-free Signals.
  users = injectLiveQuery<UserDoc[]>('users', async (client: any) => {

    const result = await client.collection('users').get().exec();

    console.debug('Fetched users:', result);

    // The double-cast bypasses the strict JsonValue union check
    return result as unknown as UserDoc[];

  });

  // Write a new document to the OPFS database
  async addUser() {
    const randomId = Math.random().toString(36).substring(2, 9);

    await this.molten.client.collection('users').set({
      [randomId]: {
        name: 'Angular Dev ' + randomId,
        role: 'Admin'
      }
    }).exec();

    console.log('Inserted user:', randomId);
  }
}