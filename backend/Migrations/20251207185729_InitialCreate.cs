using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace _.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Positions");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Flights_FlightId",
                table: "Flights");

            migrationBuilder.DropIndex(
                name: "IX_Flights_FlightId",
                table: "Flights");

            migrationBuilder.DropColumn(
                name: "CurrentLat",
                table: "Flights");

            migrationBuilder.DropColumn(
                name: "CurrentLng",
                table: "Flights");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Flights");

            migrationBuilder.RenameColumn(
                name: "StartLng",
                table: "Flights",
                newName: "StartLon");

            migrationBuilder.RenameColumn(
                name: "EndLng",
                table: "Flights",
                newName: "EndLon");

            migrationBuilder.CreateTable(
                name: "FlightPositions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    FlightId = table.Column<string>(type: "TEXT", nullable: false),
                    Latitude = table.Column<double>(type: "REAL", nullable: false),
                    Longitude = table.Column<double>(type: "REAL", nullable: false),
                    Altitude = table.Column<double>(type: "REAL", nullable: false),
                    Timestamp = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FlightPositions", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FlightPositions");

            migrationBuilder.RenameColumn(
                name: "StartLon",
                table: "Flights",
                newName: "StartLng");

            migrationBuilder.RenameColumn(
                name: "EndLon",
                table: "Flights",
                newName: "EndLng");

            migrationBuilder.AddColumn<double>(
                name: "CurrentLat",
                table: "Flights",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "CurrentLng",
                table: "Flights",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Flights",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Flights_FlightId",
                table: "Flights",
                column: "FlightId");

            migrationBuilder.CreateTable(
                name: "Positions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    FlightId = table.Column<string>(type: "TEXT", nullable: false),
                    Altitude = table.Column<double>(type: "REAL", nullable: false),
                    Latitude = table.Column<double>(type: "REAL", nullable: false),
                    Longitude = table.Column<double>(type: "REAL", nullable: false),
                    Progress = table.Column<double>(type: "REAL", nullable: false),
                    Speed = table.Column<double>(type: "REAL", nullable: false),
                    Timestamp = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Positions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Positions_Flights_FlightId",
                        column: x => x.FlightId,
                        principalTable: "Flights",
                        principalColumn: "FlightId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Flights_FlightId",
                table: "Flights",
                column: "FlightId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Positions_FlightId_Timestamp",
                table: "Positions",
                columns: new[] { "FlightId", "Timestamp" });
        }
    }
}
